from app.services.prediction_service import prediction_service


def main():

    print("\n=== PREDICTION SERVICE TEST ===\n")

    date_str = "2025-01-01"

    dataset = prediction_service.get_prediction(
        date_str
    )

    print("\nDataset:")
    print(dataset)

    print(
        "\nTemperature shape:",
        dataset["temperature"].shape,
    )

    profile = prediction_service.predict_point(
        date_str=date_str,
        latitude=12.625,
        longitude=90.125,
    )

    print(
        "\nPoint profile shape:",
        profile.shape,
    )

    print("\nProfile:")

    for depth, temperature in zip(
        dataset["depth"].values,
        profile,
    ):
        print(
            f"{float(depth):7.1f} m : "
            f"{float(temperature):8.3f} °C"
        )

    print(
        "\n=== PREDICTION SERVICE TEST PASSED ===\n"
    )


if __name__ == "__main__":
    main()