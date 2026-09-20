import numpy as np
import torch

from app.config import settings
from app.services.test_data_service import test_data_service
from app.services.model_service import model_service


def main():

    date_str = "2025-01-01"

    print("\n=== ANTARBODH END-TO-END INFERENCE TEST ===\n")

    # ---------------------------------------------------------
    # 1. Load preprocessed input
    # ---------------------------------------------------------

    print(
        f"[1] Loading preprocessed input for {date_str}"
    )

    model_input = test_data_service.get_input(
        date_str
    )

    print(
        f"    Input shape: {model_input.shape}"
    )

    print(
        f"    Input dtype: {model_input.dtype}"
    )

    # ---------------------------------------------------------
    # 2. Convert to tensor
    # ---------------------------------------------------------

    input_tensor = (
        torch.from_numpy(model_input)
        .unsqueeze(0)
        .float()
    )

    print(
        f"\n[2] Tensor shape: "
        f"{tuple(input_tensor.shape)}"
    )

    # ---------------------------------------------------------
    # 3. Run CNN
    # ---------------------------------------------------------

    print("\n[3] Running CNN inference...")

    prediction = model_service.predict(
        input_tensor
    )

    prediction = np.asarray(
        prediction,
        dtype=np.float32,
    )

    print(
        f"    Output shape: {prediction.shape}"
    )

    print(
        f"    Output dtype: {prediction.dtype}"
    )

    # ---------------------------------------------------------
    # 4. Validate shape
    # ---------------------------------------------------------

    coordinates = (
        test_data_service.get_coordinates()
    )

    latitude = coordinates["latitude"]
    longitude = coordinates["longitude"]
    depth = coordinates["depth"]

    expected_shape = (
        len(depth),
        len(latitude),
        len(longitude),
    )

    print(
        f"\n[4] Expected output: "
        f"{expected_shape}"
    )

    print(
        f"    Actual output:   "
        f"{prediction.shape}"
    )

    assert prediction.shape == expected_shape

    # ---------------------------------------------------------
    # 5. Validate numerical output
    # ---------------------------------------------------------

    assert np.all(
        np.isfinite(prediction)
    )

    print(
        "\n[5] Prediction statistics:"
    )

    print(
        f"    Min:  {prediction.min():.4f}"
    )

    print(
        f"    Max:  {prediction.max():.4f}"
    )

    print(
        f"    Mean: {prediction.mean():.4f}"
    )

    # ---------------------------------------------------------
    # 6. Print depth profile at one grid point
    # ---------------------------------------------------------

    lat_index = len(latitude) // 2
    lon_index = len(longitude) // 2

    profile = prediction[
        :,
        lat_index,
        lon_index,
    ]

    print(
        "\n[6] Example temperature profile:"
    )

    print(
        f"    Latitude:  "
        f"{latitude[lat_index]:.3f}"
    )

    print(
        f"    Longitude: "
        f"{longitude[lon_index]:.3f}"
    )

    for d, temperature in zip(
        depth,
        profile,
    ):
        print(
            f"    {float(d):7.1f} m : "
            f"{float(temperature):8.3f} °C"
        )

    print(
        "\n=== END-TO-END INFERENCE TEST PASSED ===\n"
    )


if __name__ == "__main__":
    main()