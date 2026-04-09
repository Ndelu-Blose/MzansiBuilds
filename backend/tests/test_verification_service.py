from verification_service import compute_verification


def test_compute_verification_owner():
    ownership, verification = compute_verification(1, 1, {2, 3})
    assert ownership.value == "owner"
    assert verification.value == "verified_owner"


def test_compute_verification_contributor():
    ownership, verification = compute_verification(4, 1, {2, 4})
    assert ownership.value == "contributor"
    assert verification.value == "verified_contributor"


def test_compute_verification_unverified():
    ownership, verification = compute_verification(9, 1, {2, 3})
    assert ownership.value == "external"
    assert verification.value == "unverified"
