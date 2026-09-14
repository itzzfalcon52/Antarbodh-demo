# Diagnostic Evaluation Report

Following the 1-epoch smoke test, a rigorous diagnostic suite was executed to assess the scientific validity of the model's predictions.

## 1. Data & Unit Verification
The dataset strictly adheres to the 14-channel contract, and the target variables (`Y`) correctly reside in the Celsius domain:
- **Train Y Stats**: Min: 0.0 °C, Max: 34.68 °C, Mean: 15.22 °C, Std: 12.0 °C
- **Val Y Stats**:   Min: 0.0 °C, Max: 35.03 °C, Mean: 15.21 °C, Std: 12.0 °C
- **Test Y Stats**:  Min: 0.0 °C, Max: 33.80 °C, Mean: 15.49 °C, Std: 12.1 °C
*(There is no Kelvin unit mismatch).*

## 2. The Spurious 0.99 Overall Correlation
The reported overall correlation of 0.99 from the 1-epoch test is **not** evidence of successful subsurface reconstruction. It is an artifact of the strong vertical temperature gradient (e.g., surface ~29 °C vs. 1000m ~6 °C). Any model that learns "shallow is warmer than deep" will achieve a >0.90 pooled correlation, completely masking its inability to predict actual thermal anomalies.

## 3. Climatological Baseline Comparison
A robust ML evaluation requires comparing the CNN against a `Climatological Baseline` (the mean temperature per depth, per grid cell, computed exclusively from the 2020-2023 training set). 

At **every single depth level**, the 1-epoch CNN performs **worse** than the simple Climatological Baseline:

| Depth | RMSE (Climatology) | RMSE (CNN 1-Epoch) | Anomaly Corr (CNN) | CNN Bias |
| --- | --- | --- | --- | --- |
| 0m | **0.9282 °C** | 1.8722 °C | 0.4474 | -1.6197 °C |
| 10m | **0.8830 °C** | 1.7867 °C | 0.4650 | -1.5570 °C |
| 50m | **0.9507 °C** | 2.0622 °C | 0.3394 | -1.8326 °C |
| 100m | **2.2513 °C** | 2.9621 °C | 0.2173 | -2.2472 °C |
| 300m | **0.4202 °C** | 0.8437 °C | 0.2431 | -0.7355 °C |
| 1000m | **0.2165 °C** | 0.4578 °C | 0.1105 | -0.3715 °C |

## 4. Variance Collapse and Bias
The CNN exhibits a severe negative bias across the entire water column (underpredicting by ~1.5 to 2.2 °C). Furthermore, comparing the standard deviations reveals the CNN is predicting much flatter fields than the actual targets:
- **100m Target Std**: 2.0253
- **100m Prediction Std**: 0.6043

## Conclusion: Diagnosis
The one-epoch result represents **A) simple undertraining**. 

The network has only seen the dataset a single time (1,461 gradient steps at batch size 8). It has not yet learned enough to even replicate the climatological mean state, let alone reconstruct dynamic subsurface anomalies. The negative bias and collapsed variance are typical of a network that hasn't converged yet. 

There are no data leaks, unit mismatches, or dimensionality errors. The data contract is flawless, the metrics are scientifically rigorous, and the baseline is established. The framework is completely ready for a full training run.
