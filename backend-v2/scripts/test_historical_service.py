from app.services.historical_service import historical_service


def main():

    print("\n=== HISTORICAL SERVICE TEST ===\n")

    # ---------------------------------------------------------
    # Date availability
    # ---------------------------------------------------------

    for date in [
        "2025-01-01",
        "2025-06-15",
        "2025-12-31",
    ]:

        available = historical_service.has_date(
            date
        )

        print(
            f"{date}: {available}"
        )

        assert available

    # ---------------------------------------------------------
    # Temperature field
    # ---------------------------------------------------------

    print(
        "\nTesting temperature field..."
    )

    field = historical_service.get_temperature_field(
        date_str="2025-01-01",
        depth=100,
    )

    print(
        f"Mode: {field['mode']}"
    )

    print(
        f"Date: {field['date']}"
    )

    print(
        f"Depth: {field['depth_m']} m"
    )

    print(
        f"Grid: "
        f"{len(field['latitude'])} × "
        f"{len(field['longitude'])}"
    )

    print(
        f"Temperature rows: "
        f"{len(field['temperature'])}"
    )

    assert field["mode"] == "historical"
    assert field["date"] == "2025-01-01"
    assert len(field["latitude"]) == 60
    assert len(field["longitude"]) == 80
    assert len(field["temperature"]) == 60

    # ---------------------------------------------------------
    # Profile
    # ---------------------------------------------------------

    print(
        "\nTesting profile..."
    )

    profile = historical_service.get_profile(
        date_str="2025-01-01",
        lat=12.625,
        lon=90.125,
    )

    print(
        f"Mode: {profile['mode']}"
    )

    print(
        f"Date: {profile['date']}"
    )

    print(
        f"Coordinates: "
        f"{profile['latitude']}, "
        f"{profile['longitude']}"
    )

    print(
        f"Depth count: "
        f"{len(profile['depths_m'])}"
    )

    print(
        "\nProfile:"
    )

    for depth, temperature in zip(
        profile["depths_m"],
        profile["temperature_degC"],
    ):
        print(
            f"{float(depth):7.1f} m : "
            f"{temperature!s:>10}"
        )

    assert profile["mode"] == "historical"
    assert len(profile["depths_m"]) == 15
    assert len(profile["temperature_degC"]) == 15

    print(
        "\n=== HISTORICAL SERVICE TEST PASSED ===\n"
    )


if __name__ == "__main__":
    main()