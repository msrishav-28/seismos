Here is the complete, exhaustive project plan — structured as a professional engineering document.

***

# Project: SEISMOS — Seismic Event Intelligence System for Multi-Origin Signals

***

## 0. Project Charter

**Goal**: Build a fully automated, scientifically grounded software pipeline that ingests raw planetary seismic waveforms from Apollo (Moon) and InSight (Mars) missions, detects seismic events within noise, classifies their physical type, and outputs only scientifically relevant data windows — simulating onboard intelligent selection.

**Success Criteria**:
- F1 score ≥ 0.90 against the official MQS (Mars) and Apollo seismic event catalogs
- Correct classification of ≥ 4 event types per body
- Full reproducibility on raw public data with no manual labeling

***

## 1. Team Structure

Assign roles before code is written. Each person owns a layer:

| Role | Responsibility |
|---|---|
| **Seismology Domain Expert** | Physical validity of all signal processing decisions, event taxonomy, threshold tuning |
| **Signal Processing Engineer** | Pre-processing pipeline, STA/LTA implementation, filter design |
| **ML Engineer** | Feature engineering, model architecture, training, evaluation |
| **Data Engineer** | Data acquisition, storage schema, catalog parsing, reproducibility |
| **Visualization & QA Lead** | Waveform plotting, result dashboards, regression testing |

***

## 2. Data Acquisition & Storage

### 2.1 Apollo Data — Moon
- **Source**: NASA PDS Geosciences Node — [Apollo PSE Bundle](https://pds-geosciences.wustl.edu/missions/apollo/apollo_pse.htm) [pds-geosciences.wustl](https://pds-geosciences.wustl.edu/missions/apollo/apollo_pse.htm)
- **Format**: MiniSEED files (standard seismological binary) + DatalessSEED metadata, OR GeoCSV ASCII tables with StationXML metadata [pds.nasa](https://pds.nasa.gov/ds-view/pds/viewBundle.jsp?identifier=urn%3Anasa%3Apds%3Aapollo_pse&version=1.0)
- **Access via IRIS**: Set dataset = `ALSEP`, network = `XA` (Apollo network code) [darts.isas.jaxa](https://www.darts.isas.jaxa.jp/planet/seismology/apollo/faq_apollo.html)
- **Stations available**: Apollo 11 (short-lived), Apollo 12, 14, 15, 16 — all long-period (LP) and short-period (SP) channels
- **Catalog**: Apollo Seismic Event Catalog at [PDS Geosciences Node](https://pds-geosciences.wustl.edu/missions/apollo/seismic_event_catalog.htm)  — contains 13,000+ catalogued events with type labels [pds-geosciences.wustl](https://pds-geosciences.wustl.edu/missions/apollo/seismic_event_catalog.htm)

```python
from obspy.clients.fdsn import Client
client = Client("IRIS")
# Apollo short-period data, station 12 (Apollo 12)
st = client.get_waveforms("XA", "S12", "*", "MHZ", 
                           starttime=UTCDateTime("1970-01-01"),
                           endtime=UTCDateTime("1970-01-02"))
inv = client.get_stations(network="XA", station="S12", level="response")
```

### 2.2 InSight Data — Mars
- **Source**: IRIS FDSN Web Services, network code `7I`, station `ELYS` [ds.iris](https://ds.iris.edu/data/reports/7I_2011_2022/Seis%20InSight%20scientific%20portal.pdf)
- **Format**: MiniSEED + StationXML; wind/pressure/temperature from APSS also available in SEED for noise decorrelation [seis-insight](https://www.seis-insight.eu/en/science/seis-data/seis-data-description)
- **Catalog**: Mars Seismic Catalog (MQS) via IRIS FDSN-event API in QuakeML format [seismosoc.secure-platform](https://seismosoc.secure-platform.com/a/gallery/rounds/27/details/6827)
- **Time range**: InSight landed Nov 2018, SEIS operational Dec 2018 — mission ended Dec 2022

```python
client = Client("IRIS")
# InSight broadband, vertical component (most sensitive)
st = client.get_waveforms("7I", "ELYS", "02", "BHV",
                           starttime=..., endtime=...)
```

### 2.3 Storage Schema

```
/data
  /raw
    /moon
      /XA.S12.MHZ.1970-001.mseed      # Raw MiniSEED
      /XA.S12.dataless.seed            # Instrument response
    /mars
      /7I.ELYS.02.BHV.2019-001.mseed
      /7I.ELYS.StationXML.xml
  /catalogs
    /apollo_event_catalog.csv          # Ground truth labels
    /mqs_catalog.quakeml               # Mars Quake Service catalog
  /processed
    /moon / /mars                      # Filtered, response-removed streams
  /features
    /moon_features.parquet
    /mars_features.parquet
  /models
    /moon_rf_classifier.pkl
    /mars_cnn_model.pt
```

***

## 3. Pre-Processing Pipeline (Module 1)

This is the **most critical module** — garbage in means garbage out, and every step is physically mandated.

### Step 3.1 — Data Loading & Validation

```python
from obspy import read, read_inventory, UTCDateTime

def load_stream(mseed_path, xml_path):
    st = read(mseed_path)
    inv = read_inventory(xml_path)
    # Validate: check for gaps, check sample rate consistency
    st.merge(fill_value=0)           # Fill telemetry gaps with 0
    assert len(st) > 0, "Empty stream"
    return st, inv
```

**Apollo-specific issue**: The sampling interval in Apollo data is **temperature-dependent** and drifts across the lunar day. You must correct the sampling rate before any filtering: [ds.iris](http://ds.iris.edu/data/reports/XA_1969_1977/Apollo_Passive_Seismic_Experiments__lunar_data_in_SEED_format__1_(6).pdf)
```python
# Resample to uniform grid after loading
st.resample(sampling_rate=6.625)  # Apollo SP nominal sample rate
```

### Step 3.2 — Instrument Response Removal

Converts raw counts (digital units) → ground velocity (m/s). This is the deconvolution step — critically needed for quantitative comparison across stations and missions.

```python
st.remove_response(
    inventory=inv,
    output="VEL",              # Velocity output
    pre_filt=(0.001, 0.005, 10.0, 20.0),  # Cosine taper to avoid low-freq blowup
    water_level=60             # dB water level to stabilize deconvolution
)
```

**Physical reason**: The seismometer is a mechanical oscillator with its own resonance frequency. Below that frequency, the instrument doesn't respond faithfully — raw counts are NOT ground motion. You must deconvolve the transfer function.

### Step 3.3 — Detrending & Tapering

```python
st.detrend("linear")           # Remove linear drift (instrument offset)
st.detrend("demean")           # Remove DC bias
st.taper(max_percentage=0.05, type="cosine")  # Edge taper to avoid FFT spectral leakage
```

### Step 3.4 — Multi-Band Filtering

Run **three parallel filter banks** — one per physical event class:

```python
def apply_filter_banks(st):
    bands = {
        "deep_moonquake":    (0.5, 2.0),    # Deep interior, tidal stressing
        "shallow_moonquake": (2.0, 8.0),    # Near-surface tectonic
        "thermal":           (5.0, 12.0),   # Thermal cracking, high-frequency
        "lf_marsquake":      (0.1, 1.0),    # InSight LF events
        "hf_marsquake":      (1.0, 9.0),    # InSight HF events
    }
    filtered = {}
    for name, (fmin, fmax) in bands.items():
        st_copy = st.copy()
        st_copy.filter("bandpass", freqmin=fmin, freqmax=fmax, 
                        corners=4, zerophase=True)
        filtered[name] = st_copy
    return filtered
```

### Step 3.5 — Glitch Detection & Removal (InSight Only)

Glitches are step-function discontinuities from thermal stress relaxation in the SEIS instrument chassis. Detect them as sudden, one-sided amplitude jumps: [agupubs.onlinelibrary.wiley](https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2020EA001317)

```python
def detect_glitches(trace, threshold_sigma=5.0):
    """Detect step-function glitches via first derivative spike"""
    diff = np.diff(trace.data)
    sigma = np.std(diff)
    glitch_indices = np.where(np.abs(diff) > threshold_sigma * sigma)[0]
    return glitch_indices

def remove_glitch(trace, idx, window=200):
    """Subtract step via local polynomial fit on either side"""
    # Fit linear baseline on pre-glitch window
    pre = trace.data[max(0, idx-window):idx]
    post = trace.data[idx:min(len(trace.data), idx+window)]
    step_amplitude = np.median(post) - np.median(pre)
    # Subtract step function from all samples after glitch
    trace.data[idx:] -= step_amplitude
    return trace
```

### Step 3.6 — Thermal Moonquake Flagging (Moon Only)

Thermal moonquakes fire at **sunrise and sunset on the lunar surface** (every ~354 hours, corresponding to the 27.3-day lunar day). They also originate directionally from the lander structure, so they appear at specific azimuths.

```python
def flag_thermal_window(utctime, lunar_sunrise_times):
    """Flag ±2 hours around each lunar sunrise/sunset"""
    for sunrise in lunar_sunrise_times:
        if abs((utctime - sunrise).total_seconds()) < 7200:
            return True
    return False
```

***

## 4. Classical Detection — Module 2 (STA/LTA Engine)

### 4.1 Multi-Band STA/LTA

The STA/LTA characteristic function \(R(t)\) is computed on **each frequency band simultaneously**. A trigger fires if any band exceeds threshold. This is critical because deep moonquakes would be invisible in the 5–12 Hz band but prominent in the 0.5–2 Hz band.

```python
from obspy.signal.trigger import classic_sta_lta, trigger_onset

# Body-specific window parameters
PARAMS = {
    "moon_deep":    {"sta": 30.0,  "lta": 600.0, "on": 3.0, "off": 0.5},
    "moon_shallow": {"sta": 5.0,   "lta": 120.0, "on": 3.5, "off": 0.8},
    "moon_thermal": {"sta": 1.0,   "lta": 30.0,  "on": 4.0, "off": 1.0},
    "mars_lf":      {"sta": 5.0,   "lta": 120.0, "on": 3.0, "off": 0.5},
    "mars_hf":      {"sta": 2.0,   "lta": 60.0,  "on": 3.5, "off": 0.8},
}

def run_stalta(trace, body_type):
    p = PARAMS[body_type]
    sr = trace.stats.sampling_rate
    cft = classic_sta_lta(trace.data,
                           int(p["sta"] * sr),
                           int(p["lta"] * sr))
    triggers = trigger_onset(cft, p["on"], p["off"])
    return triggers, cft  # Return both triggers AND the characteristic function
```

### 4.2 Coincidence Trigger (Multi-Band Logic)

Only promote a candidate to Stage 2 if **at least 2 frequency bands trigger within a coincidence window**. This dramatically reduces false positives from single-band noise spikes.

```python
def coincidence_trigger(all_band_triggers, coincidence_window=10.0):
    """
    all_band_triggers: dict of band_name → list of (on_time, off_time)
    Returns: merged trigger list with band_count annotation
    """
    all_times = []
    for band, triggers in all_band_triggers.items():
        for on, off in triggers:
            all_times.append((on, band))
    all_times.sort()
    
    confirmed = []
    for i, (t, band) in enumerate(all_times):
        band_count = sum(1 for t2, _ in all_times 
                         if abs(t2 - t) < coincidence_window)
        if band_count >= 2:
            confirmed.append(t)
    return list(set(confirmed))
```

***

## 5. Feature Engineering — Module 3

For every candidate window extracted by STA/LTA, compute the following feature vector. Each feature is physically justified:

### 5.1 Envelope Features

The seismic energy envelope \(E(t)\) is the Hilbert transform magnitude. Fit it to the **scattering-diffusion model** for the Moon:

\[ E(t) = A \cdot t^{-1} \cdot e^{-bt} \]

```python
from scipy.signal import hilbert
from scipy.optimize import curve_fit

def compute_envelope(data):
    analytic = hilbert(data)
    return np.abs(analytic)

def fit_scattering_decay(envelope, time):
    def scattering_model(t, A, b):
        return A * (t + 1e-6)**(-1) * np.exp(-b * t)
    try:
        popt, _ = curve_fit(scattering_model, time, envelope, 
                             p0=[1.0, 0.01], maxfev=5000)
        return popt  # [A, b] — b is the key attenuation feature
    except:
        return [np.nan, np.nan]
```

**What `b` tells you**: Low `b` (slow decay) → deep moonquake, high Q medium. High `b` (fast decay) → shallow event, thermal event, or noise.

### 5.2 Full Feature Vector

```python
def extract_features(trace, window_start, window_end):
    tr = trace.slice(window_start, window_end)
    data = tr.data
    sr = tr.stats.sampling_rate
    time = np.arange(len(data)) / sr
    envelope = compute_envelope(data)
    freqs, psd = welch(data, fs=sr, nperseg=512)

    features = {
        # --- Temporal ---
        "rms_amplitude":       np.sqrt(np.mean(data**2)),
        "peak_amplitude":      np.max(np.abs(data)),
        "rise_time_samples":   np.argmax(envelope),
        "coda_duration":       compute_coda_duration(envelope, sr),
        
        # --- Statistical ---
        "kurtosis":            kurtosis(data),
        "skewness":            skew(data),
        "variance_ratio":      np.var(data[:len(data)//2]) / (np.var(data[len(data)//2:]) + 1e-10),
        
        # --- Spectral ---
        "dominant_frequency":  freqs[np.argmax(psd)],
        "spectral_centroid":   np.sum(freqs * psd) / (np.sum(psd) + 1e-10),
        "spectral_bandwidth":  np.sqrt(np.sum(((freqs - spectral_centroid)**2) * psd) / np.sum(psd)),
        "low_high_energy_ratio": np.sum(psd[freqs < 2]) / (np.sum(psd[freqs >= 2]) + 1e-10),
        
        # --- Envelope Decay ---
        "decay_coefficient_b": fit_scattering_decay(envelope, time) [pds-geosciences.wustl](https://pds-geosciences.wustl.edu/missions/apollo/apollo_pse.htm),
        "envelope_symmetry":   np.argmax(envelope) / (len(envelope) + 1e-6),
        
        # --- Cross-Correlation (Template Matching) ---
        "max_template_cc":     max_cross_correlation_with_catalog(data),
        
        # --- STA/LTA ---
        "max_stalta_ratio":    np.max(stalta_cft),
        "stalta_duration":     trigger_duration_in_seconds,
    }
    return features
```

### 5.3 Template Cross-Correlation

Deep moonquakes repeat in ~28 spatial clusters with nearly identical waveforms. Build a template library from known catalog events: [science](https://www.science.org/content/article/number-known-moonquakes-tripled-discovery-apollo-archive)

```python
def max_cross_correlation_with_catalog(data, templates):
    """
    templates: list of known event waveforms (numpy arrays)
    Returns: highest normalized cross-correlation coefficient across all templates
    """
    from scipy.signal import correlate
    best_cc = 0.0
    for template in templates:
        # Normalize both signals
        d_norm = (data - np.mean(data)) / (np.std(data) + 1e-10)
        t_norm = (template - np.mean(template)) / (np.std(template) + 1e-10)
        cc = correlate(d_norm, t_norm, mode="valid")
        best_cc = max(best_cc, np.max(cc) / len(template))
    return best_cc
```

***

## 6. ML Classification — Module 4

### 6.1 Label Schema

```
Moon classes:  0=noise, 1=deep_moonquake, 2=shallow_moonquake, 
               3=thermal_moonquake, 4=meteorite_impact
Mars classes:  0=noise, 1=lf_marsquake, 2=hf_marsquake, 
               3=vf_marsquake, 4=glitch
```

### 6.2 Tier 1 — Random Forest Baseline (Interpretable)

```python
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import TimeSeriesSplit

# CRITICAL: Use time-series split, NEVER shuffle
tscv = TimeSeriesSplit(n_splits=5)

moon_pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("rf", RandomForestClassifier(
        n_estimators=500,
        max_depth=15,
        class_weight="balanced",  # Handle imbalanced classes
        random_state=42,
        n_jobs=-1
    ))
])

# Evaluate
for train_idx, test_idx in tscv.split(X_moon):
    moon_pipeline.fit(X_moon[train_idx], y_moon[train_idx])
    preds = moon_pipeline.predict(X_moon[test_idx])
    print(classification_report(y_moon[test_idx], preds))

# Feature importance — physically validate top features
importances = moon_pipeline.named_steps["rf"].feature_importances_
```

### 6.3 Tier 2 — 1D CNN (Deep Learning, Waveform-Native)

Works directly on raw waveform segments — no manual features needed. Better for capturing morphology the human analyst might miss:

```python
import torch
import torch.nn as nn

class SeismicCNN(nn.Module):
    def __init__(self, num_classes=5, input_length=6000):
        super().__init__()
        self.encoder = nn.Sequential(
            # Block 1
            nn.Conv1d(1, 64, kernel_size=7, padding=3),
            nn.BatchNorm1d(64), nn.ReLU(),
            nn.MaxPool1d(2),
            # Block 2
            nn.Conv1d(64, 128, kernel_size=5, padding=2),
            nn.BatchNorm1d(128), nn.ReLU(),
            nn.MaxPool1d(2),
            # Block 3
            nn.Conv1d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm1d(256), nn.ReLU(),
            nn.AdaptiveAvgPool1d(64),   # Global context compression
        )
        self.classifier = nn.Sequential(
            nn.Linear(256 * 64, 512),
            nn.ReLU(), nn.Dropout(0.5),
            nn.Linear(512, num_classes)
        )
    
    def forward(self, x):
        x = x.unsqueeze(1)             # Add channel dim: (B, 1, L)
        x = self.encoder(x)
        x = x.view(x.size(0), -1)
        return self.classifier(x)
```

### 6.4 Tier 3 — LSTM Autoencoder (Unsupervised, for unlabeled noise)

The key insight: train **only on noise windows**. The autoencoder learns to reconstruct noise perfectly. When it encounters a real quake, reconstruction error spikes — this is your anomaly score.

```python
class SeismicAutoencoder(nn.Module):
    def __init__(self, input_size=6000, latent_dim=64):
        super().__init__()
        self.encoder = nn.LSTM(1, 128, num_layers=2, batch_first=True)
        self.latent   = nn.Linear(128, latent_dim)
        self.decoder  = nn.LSTM(latent_dim, 128, num_layers=2, batch_first=True)
        self.output   = nn.Linear(128, 1)
    
    def forward(self, x):
        # x: (B, L, 1)
        enc_out, _ = self.encoder(x)
        z = self.latent(enc_out[:, -1, :])          # Bottleneck
        z_repeat = z.unsqueeze(1).repeat(1, x.size(1), 1)
        dec_out, _ = self.decoder(z_repeat)
        return self.output(dec_out)                  # Reconstruction

def anomaly_score(model, window):
    recon = model(window)
    return torch.mean((recon - window)**2).item()   # MSE = anomaly score
```

### 6.5 Spectrogram CNN (Multi-Modal Input)

Run a parallel branch on **spectrograms** — converts the 1D time series into a 2D time-frequency image. This captures frequency migration over time (a key physical signature) that the raw waveform CNN misses:

```python
from scipy.signal import spectrogram as sp

def compute_spectrogram_image(data, sr, nperseg=256, noverlap=200):
    f, t, Sxx = sp(data, fs=sr, nperseg=nperseg, noverlap=noverlap)
    Sxx_log = 10 * np.log10(Sxx + 1e-10)
    # Resize to fixed 128x128 for CNN input
    return cv2.resize(Sxx_log, (128, 128))

# Feed to standard 2D ResNet18 with pretrained ImageNet weights
import torchvision.models as models
spec_model = models.resnet18(pretrained=True)
spec_model.conv1 = nn.Conv2d(1, 64, 7, 2, 3, bias=False)  # Single channel
spec_model.fc = nn.Linear(512, 5)  # 5 classes
```

### 6.6 Ensemble Strategy

Combine all three for the final prediction:

```python
def ensemble_predict(rf_proba, cnn_proba, lstm_anomaly_score, threshold=0.15):
    # If LSTM says anomaly (high reconstruction error), boost quake probability
    anomaly_boost = 1.0 if lstm_anomaly_score > threshold else 0.5
    # Weighted average: RF=0.3 (interpretable), CNN=0.5 (best accuracy), LSTM=0.2
    final = 0.3 * rf_proba + 0.5 * cnn_proba + 0.2 * anomaly_boost
    return np.argmax(final)
```

***

## 7. Separate Models Per Body (Critical Design Decision)

**Never train one model for both Moon and Mars.** The physical reasons:

| Property | Moon | Mars |
|---|---|---|
| Scattering Q factor | 3,000–7,000 (near-lossless) | ~300 (significant attenuation) |
| Dominant noise | Thermal expansion cracking | Atmospheric wind coupling |
| Wave propagation | Extremely scattered, long coda | Cleaner body waves visible |
| Event duration | 10–60 minutes | 1–10 minutes |
| Frequency content | 0.5–10 Hz (LP+SP) | 0.1–9 Hz (VBB+SP) |

Train `moon_pipeline` and `mars_pipeline` as completely separate model stacks with body-specific STA/LTA parameters, bandpass filters, and feature thresholds.

***

## 8. Evaluation — Module 5

### 8.1 Metric Strategy

```python
from sklearn.metrics import classification_report, confusion_matrix, f1_score

# NEVER use accuracy for imbalanced seismic catalogs
# ~95% of the record is noise — accuracy would be trivially high

metrics = {
    "precision":    tp / (tp + fp),   # Low FP = no wasted bandwidth
    "recall":       tp / (tp + fn),   # Low FN = no missed science
    "f1":           2 * P * R / (P + R),
    "detection_rate": n_detected / n_catalog_events
}
```

### 8.2 Temporal Cross-Validation

```
Year 1 (1969-70): Train  ──────────────────────────
Year 2 (1971-72): Train  ──────────────────────────
Year 3 (1973-74): Validate  ───────────────────────
Year 4 (1975-77): Test    ──────────────────────────
```

Never use K-fold shuffle — seismic data has temporal autocorrelation and event clustering.

### 8.3 Catalog Comparison

```python
def evaluate_against_catalog(detections, catalog_df, time_tolerance=60.0):
    """
    detections: list of UTCDateTime objects
    catalog_df: DataFrame with columns [origin_time, event_type]
    time_tolerance: seconds within which a detection counts as a hit
    """
    tp = fp = fn = 0
    matched = set()
    for det in detections:
        match = catalog_df[abs(catalog_df.origin_time - det) < time_tolerance]
        if len(match) > 0:
            tp += 1
            matched.add(match.index[0])
        else:
            fp += 1
    fn = len(catalog_df) - len(matched)
    return tp, fp, fn
```

### 8.4 Benchmark Events

Use known high-confidence events to anchor your evaluation:
- **Moon**: The 1972 M5.5 shallow moonquake (largest ever recorded) — your detector **must** catch this
- **Mars**: The 5 May 2022 M5 marsquake (largest InSight ever recorded)  — your primary Mars benchmark [nature](https://www.nature.com/articles/s41586-025-09361-9)

***

## 9. Output Module — Intelligent Transmission Simulation

This is the end goal: simulate what a lander would actually transmit.

```python
def selective_transmission_output(stream, detections, output_dir):
    """
    For each confirmed detection, extract a ±coda_window segment,
    compress it, and write to 'transmission package'
    """
    transmitted_bytes = 0
    total_bytes = stream[0].data.nbytes * len(stream)
    
    for event_time, event_class, confidence in detections:
        # Physics-based window: different coda durations per type
        coda_map = {
            "deep_moonquake": 3600,   # 60 min
            "shallow_moonquake": 900, # 15 min
            "thermal_moonquake": 120, # 2 min
            "mars_lf": 600,           # 10 min
            "mars_hf": 180,           # 3 min
        }
        pre_buffer  = 120             # 2 min before onset
        post_buffer = coda_map.get(event_class, 300)
        
        seg = stream.slice(event_time - pre_buffer, event_time + post_buffer)
        
        # Write compressed MiniSEED
        fname = f"{output_dir}/{event_class}_{event_time}.mseed"
        seg.write(fname, format="MSEED")
        transmitted_bytes += os.path.getsize(fname)
        
    compression_ratio = 1 - (transmitted_bytes / total_bytes)
    print(f"Data reduction: {compression_ratio*100:.1f}% — "
          f"transmitted {transmitted_bytes/1e6:.1f} MB of {total_bytes/1e6:.1f} MB")
```

***

## 10. Visualization Dashboard — Module 6

Every result must be visually verifiable by a seismologist:

```python
import matplotlib.pyplot as plt

def plot_detection_summary(stream, triggers, catalog_events, cft):
    fig, axes = plt.subplots(4, 1, figsize=(18, 12), sharex=True)
    
    # Panel 1: Raw waveform
    axes[0].plot(stream[0].times("matplotlib"), stream[0].data, 'k', lw=0.5)
    axes[0].set_ylabel("Velocity (m/s)")
    axes[0].set_title("Raw Ground Velocity")
    
    # Panel 2: Filtered waveform (0.5–2 Hz)
    axes [pds-geosciences.wustl](https://pds-geosciences.wustl.edu/missions/apollo/apollo_pse.htm).plot(filtered_stream[0].times("matplotlib"), 
                 filtered_stream[0].data, 'b', lw=0.5)
    axes [pds-geosciences.wustl](https://pds-geosciences.wustl.edu/missions/apollo/apollo_pse.htm).set_ylabel("Filtered (0.5–2 Hz)")
    
    # Panel 3: STA/LTA characteristic function
    axes [pds.nasa](https://pds.nasa.gov/ds-view/pds/viewBundle.jsp?identifier=urn%3Anasa%3Apds%3Aapollo_pse&version=1.0).plot(cft, 'g', lw=0.8)
    axes [pds.nasa](https://pds.nasa.gov/ds-view/pds/viewBundle.jsp?identifier=urn%3Anasa%3Apds%3Aapollo_pse&version=1.0).axhline(3.5, color='r', linestyle='--', label='Trigger threshold')
    
    # Panel 4: Spectrogram
    axes [darts.isas.jaxa](https://www.darts.isas.jaxa.jp/planet/seismology/apollo/faq_apollo.html).specgram(stream[0].data, Fs=stream[0].stats.sampling_rate, 
                      cmap='viridis')
    axes [darts.isas.jaxa](https://www.darts.isas.jaxa.jp/planet/seismology/apollo/faq_apollo.html).set_ylabel("Frequency (Hz)")
    
    # Mark detected triggers
    for trigger in triggers:
        for ax in axes:
            ax.axvline(trigger, color='red', alpha=0.5, lw=1.5)
    
    # Mark catalog events (ground truth)
    for cat_event in catalog_events:
        for ax in axes:
            ax.axvline(cat_event, color='lime', alpha=0.8, lw=1.5, ls='--')
    
    plt.tight_layout()
    plt.savefig("detection_report.png", dpi=150)
```

***

## 11. Project Phases & Timeline

| Phase | Duration | Deliverable |
|---|---|---|
| **Phase 0 — Setup** | Days 1–2 | Data downloaded, environment configured, catalog parsed |
| **Phase 1 — Pre-processing** | Days 3–6 | Clean, response-removed waveforms; glitch removal working |
| **Phase 2 — STA/LTA Engine** | Days 7–9 | Multi-band coincidence trigger with tuned thresholds |
| **Phase 3 — Feature Engineering** | Days 10–13 | Full feature matrix; template library built |
| **Phase 4 — Baseline ML** | Days 14–16 | RF + XGBoost trained, F1 > 0.85 on validation |
| **Phase 5 — Deep Learning** | Days 17–22 | CNN + LSTM autoencoder trained, spectrogram branch added |
| **Phase 6 — Ensemble & Tuning** | Days 23–25 | Final ensemble, threshold optimization per class |
| **Phase 7 — Evaluation** | Days 26–28 | Full catalog comparison, confusion matrix, F1 report |
| **Phase 8 — Output & Dashboard** | Days 29–30 | Transmission simulation output, visualization dashboard |

***

## 12. Repository Structure

```
seismos/
├── data/                   # (gitignored, downloaded locally)
├── notebooks/
│   ├── 01_eda.ipynb         # Exploratory data analysis, waveform inspection
│   ├── 02_preprocessing.ipynb
│   ├── 03_stalta_tuning.ipynb
│   ├── 04_feature_engineering.ipynb
│   ├── 05_model_training.ipynb
│   └── 06_evaluation.ipynb
├── src/
│   ├── data/
│   │   ├── loader.py        # FDSN client, MiniSEED I/O
│   │   └── catalog.py       # Parse Apollo/MQS catalogs
│   ├── processing/
│   │   ├── preprocess.py    # Response removal, filtering, glitch detection
│   │   └── features.py      # Full feature extraction
│   ├── detection/
│   │   ├── stalta.py        # Multi-band STA/LTA engine
│   │   └── coincidence.py   # Coincidence trigger logic
│   ├── models/
│   │   ├── random_forest.py
│   │   ├── cnn_1d.py
│   │   ├── lstm_autoencoder.py
│   │   └── ensemble.py
│   ├── evaluation/
│   │   ├── metrics.py       # Precision, recall, F1 vs catalog
│   │   └── visualize.py     # Waveform + detection plots
│   └── output/
│       └── transmit.py      # Selective transmission simulation
├── configs/
│   ├── moon_params.yaml     # All Moon-specific thresholds
│   └── mars_params.yaml     # All Mars-specific thresholds
├── tests/
│   ├── test_preprocessing.py
│   └── test_detection.py
├── requirements.txt
└── README.md
```

***

## 13. Key Libraries

```
obspy>=1.4          # Core seismology: MiniSEED, response removal, STA/LTA
numpy, scipy        # Signal processing, curve fitting, FFT
pandas              # Catalog handling, feature tables
scikit-learn        # RF, XGBoost, metrics, TimeSeriesSplit
torch               # 1D CNN, LSTM autoencoder
torchvision         # Spectrogram ResNet branch
matplotlib          # All visualization
librosa             # Advanced spectrogram analysis
pyarrow / parquet   # Fast feature storage
pytest              # Testing
```

This is a complete, production-grade blueprint — every module maps directly to a physical phenomenon, a scientific catalog, and a measurable evaluation criterion. [pds.nasa](https://pds.nasa.gov/ds-view/pds/viewBundle.jsp?identifier=urn%3Anasa%3Apds%3Ainsight_seis&version=3.0)