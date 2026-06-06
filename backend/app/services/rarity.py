from app.enums.rarity import Rarity

BASE_RARITY_BY_FOIL = {
    Rarity.FOIL.value: Rarity.EPIC.value,
    Rarity.FOIL_EPIC.value: Rarity.EPIC.value,
    Rarity.FOIL_MYTHIC.value: Rarity.MYTHIC.value,
    Rarity.FOIL_LEGENDARY.value: Rarity.LEGENDARY.value,
    Rarity.FOIL_FOUNDER_LEGENDARY.value: Rarity.FOUNDER_LEGENDARY.value,
}

FOIL_RARITY_BY_BASE = {
    Rarity.RARE.value: Rarity.FOIL_EPIC.value,
    Rarity.EPIC.value: Rarity.FOIL_EPIC.value,
    Rarity.MYTHIC.value: Rarity.FOIL_MYTHIC.value,
    Rarity.LEGENDARY.value: Rarity.FOIL_LEGENDARY.value,
    Rarity.FOUNDER_LEGENDARY.value: Rarity.FOIL_FOUNDER_LEGENDARY.value,
}


def roll_rarity(mint_number: int) -> Rarity:
    return Rarity.LEGENDARY


def get_base_rarity(rarity: str) -> str:
    return BASE_RARITY_BY_FOIL.get(rarity, rarity)


def get_foil_rarity(rarity: str) -> str:
    base_rarity = get_base_rarity(rarity)
    return FOIL_RARITY_BY_BASE.get(base_rarity, Rarity.FOIL_EPIC.value)
