from app.services.test_data_service import test_data_service


def main():
    print("\n=== ANTARBODH TEST DATA SMOKE TEST ===\n")

    # ---------------------------------------------------------
    # Dates
    # ---------------------------------------------------------

    dates = test_data_service.get_available_dates()

    print(f"Number of dates: {len(dates)}")
    print(f"First date:     {dates[0]}")
    print(f"Last date:      {dates[-1]}")

    # ---------------------------------------------------------
    # Date availability
    # ---------------------------------------------------------

    for date in [
        "2025-01-01",
        "2025-06-15",
        "2025-12-31",
    ]:
        print(
            f"{date}: "
            f"{test_data_service.has_date(date)}"
        )

    # ---------------------------------------------------------
    # Load one model input
    # ---------------------------------------------------------

    x = test_data_service.get_input(
        "2025-01-01"
    )

    print("\nModel input:")
    print(f"  shape: {x.shape}")
    print(f"  dtype: {x.dtype}")
    print(f"  min:   {x.min()}")
    print(f"  max:   {x.max()}")
    print(f"  mean:  {x.mean()}")

    # ---------------------------------------------------------
    # Coordinates
    # ---------------------------------------------------------

    coords = test_data_service.get_coordinates()

    print("\nCoordinates:")

    print(
        f"  latitude:  "
        f"{coords['latitude'].shape}"
    )

    print(
        f"  longitude: "
        f"{coords['longitude'].shape}"
    )

    print(
        f"  depth:     "
        f"{coords['depth']}"
    )

    print("\n=== TEST PASSED ===")


if __name__ == "__main__":
    main()