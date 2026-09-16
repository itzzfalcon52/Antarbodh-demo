from pathlib import Path
import json

from fastapi import APIRouter, HTTPException

from ...config import settings


router = APIRouter()


@router.get("/report")
def get_validation_report():
    """
    Return the precomputed ANTARBODH vs ARGO validation report.

    The report is generated offline and stored at the path configured
    by settings.argo_validation_report.

    Validation sources:
        - ANTARBODH reconstruction
        - Independent ARGO observations
        - GLORYS same-observation reference benchmark
    """

    report_path = Path(
        settings.argo_validation_report
    ).expanduser()

    # --------------------------------------------------------------
    # Diagnostic logging
    # --------------------------------------------------------------

    print(
        f"[VALIDATION] Looking for report at: "
        f"{report_path}"
    )

    print(
        f"[VALIDATION] Report exists: "
        f"{report_path.exists()}"
    )

    # --------------------------------------------------------------
    # Validate file
    # --------------------------------------------------------------

    if not report_path.exists():

        raise HTTPException(
            status_code=404,
            detail=(
                "Validation report not found at "
                f"{report_path}"
            ),
        )

    if not report_path.is_file():

        raise HTTPException(
            status_code=500,
            detail=(
                "Validation report path is not a file: "
                f"{report_path}"
            ),
        )

    # --------------------------------------------------------------
    # Read JSON
    # --------------------------------------------------------------

    try:

        with report_path.open(
            "r",
            encoding="utf-8",
        ) as f:

            data = json.load(f)

    except json.JSONDecodeError as exc:

        raise HTTPException(
            status_code=500,
            detail=(
                "Validation report contains invalid JSON: "
                f"{exc}"
            ),
        ) from exc

    except OSError as exc:

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to read validation report: "
                f"{exc}"
            ),
        ) from exc

    # --------------------------------------------------------------
    # Basic structure validation
    #
    # This catches a wrong/old JSON file before the frontend
    # receives it.
    # --------------------------------------------------------------

    required_sections = [
        "sample",
        "antarbodh_vs_argo",
        "glorys_vs_argo",
        "per_depth",
    ]

    missing_sections = [
        section
        for section in required_sections
        if section not in data
    ]

    if missing_sections:

        raise HTTPException(
            status_code=500,
            detail=(
                "Validation report is missing required "
                f"sections: {missing_sections}"
            ),
        )

    print(
        "[VALIDATION] Validation report loaded successfully."
    )

    return data