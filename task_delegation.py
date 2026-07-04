import time
import logging
import traceback
from typing import Any

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

    for attempt in range(1, max_retries + 1):
        try:
            logger.info(f"Calling LLM API (attempt {attempt}/{max_retries}): {task_description}")
            result = llm_client.complete(task_description)
            logger.info("LLM API call succeeded.")
            return result
        except Exception as e:
            last_exception = e
            logger.warning(
                f"LLM API call failed on attempt {attempt}/{max_retries}: {type(e).__name__}: {e}\n"
                f"Traceback: {traceback.format_exc()}"
            )
            if attempt < max_retries:
                time.sleep(retry_delay * attempt)

    logger.error(
        f"All {max_retries} attempts to call LLM failed. "
        f"Last error: {type(last_exception).__name__ if last_exception else 'Unknown'}: {last_exception}\n"
        f"Traceback: {traceback.format_exc() if last_exception else 'No traceback available'}"
    )
    raise RuntimeError(
        f"All {max_retries} attempts to call LLM failed for '{task_description}'. "
        f"Last error: {type(last_exception).__name__ if last_exception else 'Unknown'}: {last_exception}"
    )


def delegate_task(task_description: str, llm_client: Any, max_retries: int = 3, retry_delay: float = 1.0) -> Any:
    """
    Delegate a task to an LLM API with retry and fallback logic.
    
    Args:
        task_description: The description of the task to delegate.
        llm_client: The LLM client used to make API calls.
        max_retries: Maximum number of retry attempts on failure.
        retry_delay: Delay (in seconds) between retry attempts.
    
    Returns:
        The result from the LLM API.
    
    Raises:
        RuntimeError: If the LLM call fails after all retries or if an unexpected error occurs.
        Never returns an empty value to avoid masking failures.
    """
    logger.info(f"Delegating task to LLM: {task_description}")
    try:
        result = call_llm(llm_client, task_description, max_retries=max_retries, retry_delay=retry_delay)
        logger.info("Task delegation succeeded.")
        return result
    except RuntimeError:
        raise
    except Exception as e:
        logger.error(
            f"Unexpected error during task delegation: {type(e).__name__}: {e}\n"
            f"Traceback: {traceback.format_exc()}"
        )
        raise RuntimeError(
            f"Unexpected error during task delegation for '{task_description}': "
            f"{type(e).__name__}: {e}"
        ) from e
