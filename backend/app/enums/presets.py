from enum import StrEnum


class FigureColor(StrEnum):
    RED = "red"
    BLUE = "blue"
    GREEN = "green"
    PURPLE = "purple"
    BLACK = "black"
    GOLD = "gold"


class FigureVibe(StrEnum):
    CRYPTO = "crypto"
    CYBERPUNK = "cyberpunk"
    MEME = "meme"
    GAMER = "gamer"
    MAGIC = "magic"
    SAMURAI = "samurai"


class FigureAccessory(StrEnum):
    LAPTOP = "laptop"
    COFFEE = "coffee"
    GAMEPAD = "gamepad"
    BITCOIN_COIN = "bitcoin_coin"
    MICROPHONE = "microphone"
    DRUMSTICKS = "drumsticks"


class FigureBackground(StrEnum):
    NEON_SERVER_ROOM = "neon_server_room"
    CRYPTO_CHART = "crypto_chart"
    SPACE = "space"
    GAMING_ROOM = "gaming_room"
    CASTLE = "castle"
    WHITE_STUDIO = "white_studio"


class SourcePhotoType(StrEnum):
    TELEGRAM_PROFILE = "telegram_profile"
    UPLOADED = "uploaded"
    NONE = "none"
