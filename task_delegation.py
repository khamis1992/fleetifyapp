import time
import logging
import traceback
from typing import Any, Optional

logger = logging.getLogger(__name__)


def call_llm(llm_client: Any, task_description: str, max_retries: int = 3, retry_delay: float = 1.0) -> Any:
    """
    Call the LLM API with try/except wrapping and retry logic.
    
    Args:
        llm_client: The LLM client used to make API calls.
        task_description: The prompt/task to send to the LLM.
        max_retries: Maximum number of retry attempts on failure.
        retry_delay: Base delay (in seconds) between retry attempts (multiplied by attempt number).
    
    Returns:
        The result from the LLM API.
    
    Raises:
        RuntimeError: If the LLM client is invalid or if all retry attempts fail.
        This ensures failures are never silently masked by returning an empty value.
    """
    last_exception = None

    if llm_client is None:
        logger.error("LLM client is None; cannot call LLM.")
        raise RuntimeError("LLM client is None; cannot call LLM.")

    if not hasattr(llm_client, 'complete') or not callable(getattr(llm_client, 'complete', None)):
        logger.error("LLM client does not have a callable 'complete' method.")
        raise RuntimeError("LLM client does not have a callable 'complete' method.")

    if max_retries < 1:
        logger.error(f"Invalid max_retries value: {max_retries}; must be at least 1.")
        raise RuntimeError(f"Invalid max_retries value: {max_retries}; must be at least 1.")

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
                        f"LLM API returned None after {max_retries} attempts for '{task_description}'."
                    )
                    raise RuntimeError(
                        f"LLM API returned None after {max_retries} attempts for '{task_description}'."
                    )
            logger.info("LLM API call succeeded.")
            return result
        except Exception as e:
            last_exception = e
            logger.error(
                f"LLM API call failed on attempt {attempt}/{max_retries}: {type(e).__name__}: {e}",
                exc_info=True
            )
            if attempt < max_retries:
                logger.info(f"Retrying LLM API call (attempt {attempt}/{max_retries}) after delay.")
                time.sleep(retry_delay * attempt)
                continue
            # Last attempt failed; re-raise immediately.
            logger.error(
                f"All {max_retries} attempts to call LLM failed. "
                f"Last error: {type(last_exception).__name__ if last_exception else 'Unknown'}: {last_exception}",
                exc_info=True
            )
            raise RuntimeError(
                f"All {max_retries} attempts to call LLM failed for '{task_description}'. "
                f"Last error: {type(last_exception).__name__ if last_exception else 'Unknown'}: {last_exception}"
            ) from e


def delegate_task(
    task_description: str,
    llm_client: Any,
    max_retries: int = 3,
    retry_delay: float = 1.0,
) -> Any:
    """
    Delegate a task to an LLM API with retry logic.
    
    Wraps the LLM API call in try/except to prevent API failures from crashing
    the pipeline. On failure, logs the exception and re-raises it, ensuring
    failures are never silently masked.
    
    Args:
        task_description: The description of the task to delegate.
        llm_client: The LLM client used to make API calls.
        max_retries: Maximum number of retry attempts on failure.
        retry_delay: Delay (in seconds) between retry attempts.
    
    Returns:
        The result from the LLM API.
    
    Raises:
        RuntimeError: If the LLM call fails after all retries.
    """
    logger.info(f"Delegating task to LLM: {task_description}")
    try:
        result = call_llm(llm_client, task_description, max_retries=max_retries, retry_delay=retry_delay)
        logger.info("Task delegation succeeded.")
        return result
    except Exception as e:
        logger.error(
            f"Task delegation FAILED for '{task_description}': {type(e).__name__}: {e}. "
            "Re-raising the exception.",
            exc_info=True
        )
        raise
