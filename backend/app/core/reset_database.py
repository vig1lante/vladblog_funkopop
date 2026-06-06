import asyncio
import logging

from sqlalchemy import text

from app.core.config import Settings, settings
from app.core.database import engine

logger = logging.getLogger(__name__)

RESET_TABLES = ("generation_jobs", "figures", "users")


def should_reset_database(config: Settings = settings) -> bool:
    return config.RESET_DATABASE_ON_START and config.APP_ENV != "production"


async def reset_database_on_start() -> None:
    if not should_reset_database():
        return

    async with engine.begin() as connection:
        if connection.dialect.name == "postgresql":
            await connection.execute(
                text(
                    "TRUNCATE TABLE generation_jobs, figures, users "
                    "RESTART IDENTITY CASCADE"
                )
            )
            await connection.execute(
                text("ALTER SEQUENCE figure_mint_number_seq RESTART WITH 1")
            )
        else:
            for table in RESET_TABLES:
                await connection.execute(text(f"DELETE FROM {table}"))

    logger.warning("Database reset completed for APP_ENV=%s", settings.APP_ENV)


def main() -> None:
    asyncio.run(reset_database_on_start())


if __name__ == "__main__":
    main()
