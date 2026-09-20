import torch

from app.config import settings
from app.services.model_service import model_service


def main():

    print("\n=== ANTARBODH MODEL SMOKE TEST ===\n")

    print(
        f"Checkpoint:\n"
        f"  {settings.checkpoint_path}"
    )

    print(
        f"\nDevice:\n"
        f"  {model_service.device}"
    )

    # Load model
    model_service.load()

    print(
        "\nModel loaded:"
        f" {model_service.is_loaded()}"
    )

    # Create dummy input with the exact expected shape.
    dummy_input = torch.zeros(
        1,
        settings.input_channels,
        60,
        80,
        dtype=torch.float32,
    )

    print(
        f"\nInput shape:\n"
        f"  {tuple(dummy_input.shape)}"
    )

    # Run inference
    output = model_service.predict(
        dummy_input
    )

    print(
        f"\nOutput shape:\n"
        f"  {output.shape}"
    )

    print(
        f"\nOutput dtype:\n"
        f"  {output.dtype}"
    )

    print(
        f"\nOutput min:\n"
        f"  {output.min()}"
    )

    print(
        f"\nOutput max:\n"
        f"  {output.max()}"
    )

    print(
        f"\nOutput mean:\n"
        f"  {output.mean()}"
    )

    expected_shape = (
        len(settings.target_depths),
        60,
        80,
    )

    assert output.shape == expected_shape, (
        f"Expected {expected_shape}, "
        f"got {output.shape}"
    )

    assert torch.tensor(
        output
    ).isfinite().all(), (
        "Model output contains non-finite values"
    )

    print(
        "\n=== MODEL TEST PASSED ===\n"
    )


if __name__ == "__main__":
    main()