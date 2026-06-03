import random

from app.enums.rarity import Rarity


def roll_rarity(mint_number: int) -> Rarity:
    if mint_number == 1:
        return Rarity.FOUNDER_LEGENDARY

    value = random.random()

    if value < 0.70:
        return Rarity.RARE
    if value < 0.95:
        return Rarity.EPIC
    return Rarity.LEGENDARY
