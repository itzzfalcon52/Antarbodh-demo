from app.services.data_availability_service import (
    data_availability_service,
)


def main():

    print("\n=== AVAILABILITY SERVICE TEST ===\n")

    for date in [
        "2025-01-01",
        "2025-06-15",
        "2025-12-31",
        "2026-01-01",
        "invalid-date",
    ]:

        print(
            f"\n--- {date} ---"
        )

        result = (
            data_availability_service
            .check_availability(date)
        )

        print(
            "prediction_possible:",
            result["prediction_possible"],
        )

        print(
            "input_completeness:",
            result["input_completeness"],
        )

        print(
            "missing_inputs:",
            result["missing_inputs"],
        )

        print(
            "reason:",
            result["reason"],
        )

        for channel, status in (
            result["inputs"].items()
        ):
            print(
                f"  {channel}: "
                f"{status['available']}"
            )

    print(
        "\n=== AVAILABILITY TEST COMPLETE ===\n"
    )


if __name__ == "__main__":
    main()