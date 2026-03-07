"""
PyTorch 1D CNN for seismic waveform classification.
Input: (batch, features) [feature-based] or (batch, 1, n_samples) [raw waveform]
"""
import torch
import torch.nn as nn
import torch.nn.functional as F


class SeismicCNN(nn.Module):
    """
    Lightweight 1D CNN operating on feature vectors.
    For raw waveform mode, use SeismicWaveformCNN below.
    """
    def __init__(self, n_classes: int = 5, input_dim: int = 13):
        super().__init__()
        self.fc1  = nn.Linear(input_dim, 128)
        self.bn1  = nn.BatchNorm1d(128)
        self.drop = nn.Dropout(0.3)
        self.fc2  = nn.Linear(128, 64)
        self.fc3  = nn.Linear(64, n_classes)

    def forward(self, x):
        x = F.relu(self.bn1(self.fc1(x)))
        x = self.drop(x)
        x = F.relu(self.fc2(x))
        return self.fc3(x)


class SeismicWaveformCNN(nn.Module):
    """
    Raw waveform 1D CNN.
    Input shape: (batch, 1, 6000) — 15 min at 6.625 Hz.
    """
    def __init__(self, n_classes: int = 5):
        super().__init__()
        self.conv1 = nn.Conv1d(1, 32, kernel_size=7, stride=2, padding=3)
        self.conv2 = nn.Conv1d(32, 64, kernel_size=5, stride=2, padding=2)
        self.conv3 = nn.Conv1d(64, 128, kernel_size=3, stride=2, padding=1)
        self.pool  = nn.AdaptiveAvgPool1d(32)
        self.fc1   = nn.Linear(128 * 32, 256)
        self.drop  = nn.Dropout(0.4)
        self.fc2   = nn.Linear(256, n_classes)

    def forward(self, x):
        x = F.relu(self.conv1(x))
        x = F.relu(self.conv2(x))
        x = F.relu(self.conv3(x))
        x = self.pool(x)
        x = x.view(x.size(0), -1)
        x = F.relu(self.fc1(x))
        x = self.drop(x)
        return self.fc2(x)
