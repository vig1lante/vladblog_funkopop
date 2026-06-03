from enum import StrEnum


class FigureStatus(StrEnum):
    DRAFT = "draft"
    READY_FOR_GENERATION = "ready_for_generation"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


class GenerationJobStatus(StrEnum):
    PENDING = "pending"
    PREPARING_PROMPT = "preparing_prompt"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"
