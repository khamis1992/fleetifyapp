import os
import time
import logging
import traceback
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Default values for retry configuration (can be overridden via environment variables)
DEFAULT_MAX_RETRIES = 3
DEFAULT_RETRY_DELAY = 1.0


def _parse_env_int(name: str, default: int) -> int:
    """Parse an integer environment variable, logging an error and returning default on failure."""
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        logger.exception(f"Invalid {name} environment variable, using default {default}.")
        return default


def _parse_env_float(name: str, default: float) -> float:
    """Parse a float environment variable, logging an error and returning default on failure."""
    try:
        return float(os.getenv(name, str(default)))
    except ValueError:
        logger.exception(f"Invalid {name} environment variable, using default {default}.")
        return default


def call_llm(llm_client: Any, task_description: str, max_retries: Optional[int] = None, retry_delay: Optional[float] = None) -> Any:
    """
    Call the LLM API with try/except wrapping and retry logic.
    
    Args:
        llm_client: The LLM client used to make API calls.
        task_description: The prompt/task to send to the LLM.
        max_retries: Maximum number of retry attempts on failure. Defaults to environment variable LLM_MAX_RETRIES or 3.
        retry_delay: Base delay (in seconds) between retry attempts (multiplied by attempt number). Defaults to environment variable LLM_RETRY_DELAY or 1.0.
    
    Returns:
        The result from the LLM API, or None if all retries fail or if the client is invalid.
        This ensures failures are never silently masked by returning an empty value, but also prevents pipeline crashes.
    """
    try:
        if max_retries is None:
            max_retries = _parse_env_int("LLM_MAX_RETRIES", DEFAULT_MAX_RETRIES)
        if retry_delay is None:
            retry_delay = _parse_env_float("LLM_RETRY_DELAY", DEFAULT_RETRY_DELAY)

        last_exception = None

        if llm_client is None:
            logger.error("LLM client is None; cannot call LLM. Returning None.")
            return None

        if not hasattr(llm_client, 'complete') or not callable(getattr(llm_client, 'complete', None)):
            logger.error("LLM client does not have a callable 'complete' method. Returning None.")
            return None

        if max_retries < 1:
            logger.error(f"Invalid max_retries value: {max_retries}; must be at least 1. Returning None.")
            return None

        for attempt in range(1, max_retries + 1):
            try:
                logger.info(f"Calling LLM API (attempt {attempt}/{max_retries}): {task_description}")
                result = llm_client.complete(task_description)
                if result is None:
                    logger.warning(
                        f"LLM API returned None on attempt {attempt}/{max_retries} for '{task_description}'."
                    )
                    last_exception = RuntimeError(
                        f"LLM API returned None on attempt {attempt}/{max_retries} for '{task_description}'."
                    )
                    if attempt < max_retries:
                        time.sleep(retry_delay * attempt)
                        continue
                    else:
                        logger.error(
                            f"LLM API returned None after {max_retries} attempts for '{task_description}'. "
                            f"Last exception: {last_exception}. Returning None."
                        )
                        return None
                logger.info("LLM API call succeeded.")
                return result
            except Exception as e:
                last_exception = e
                logger.exception(
                    f"LLM API call failed on attempt {attempt}/{max_retries}: {type(e).__name__}: {e}"
                )
                if attempt < max_retries:
                    logger.warning(f"Retrying LLM API call (attempt {attempt}/{max_retries}) after delay.")
                    time.sleep(retry_delay * attempt)
                    continue
                # Last attempt failed; return None to avoid pipeline crash.
                logger.exception(
                    f"All {max_retries} attempts to call LLM failed. "
                    f"Last error: {type(e).__name__}: {e}. Returning None."
                )
                return None
    except Exception as e:
        logger.exception(
            f"Unexpected error in call_llm: {type(e).__name__}: {e}. Returning None to avoid pipeline crash."
        )
        return None


def delegate_task(
    task_description: str,
    llm_client: Any,
    max_retries: Optional[int] = None,
    retry_delay: Optional[float] = None,
) -> Any:
    """
    Delegate a task to an LLM API with retry logic and graceful fallback.
    
    Wraps the LLM API call in try/except to prevent API failures from crashing
    the pipeline. On failure, logs the exception and returns None, allowing the
    pipeline to continue with a fallback value.
    
    Args:
        task_description: The description of the task to delegate.
        llm_client: The LLM client used to make API calls.
        max_retries: Maximum number of retry attempts on failure. Defaults to environment variable LLM_MAX_RETRIES or 3.
        retry_delay: Delay (in seconds) between retry attempts. Defaults to environment variable LLM_RETRY_DELAY or 1.0.
    
    Returns:
        The result from the LLM API, or None if all retries fail.
    """
    logger.info(f"Delegating task to LLM: {task_description}")
    try:
        result = call_llm(llm_client, task_description, max_retries=max_retries, retry_delay=retry_delay)
        if result is None:
            logger.error(f"Task delegation returned None for '{task_description}'. Returning None.")
            return None
        logger.info("Task delegation succeeded.")
        return result
    except Exception as e:
        logger.exception(
            f"Task delegation FAILED for '{task_description}': {type(e).__name__}: {e}. "
            "Returning None to avoid pipeline crash."
        )
        return None
