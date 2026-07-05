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
            logger.warning(
                f"LLM API call failed on attempt {attempt}/{max_retries}: {type(e).__name__}: {e}\n"
                f"Traceback: {traceback.format_exc()}"
            )
            if attempt < max_retries:
                logger.info(f"Retrying LLM API call (attempt {attempt}/{max_retries}) after delay.")
                time.sleep(retry_delay * attempt)
                continue
            else:
                logger.error(
                    f"All {max_retries} attempts to call LLM failed. "
                    f"Last error: {type(last_exception).__name__ if last_exception else 'Unknown'}: {last_exception}\n"
                    f"Traceback: {traceback.format_exc() if last_exception else 'No traceback available'}"
                )
                raise RuntimeError(
                    f"All {max_retries} attempts to call LLM failed for '{task_description}'. "
                    f"Last error: {type(last_exception).__name__ if last_exception else 'Unknown'}: {last_exception}"
                ) from e

    logger.error(
        f"All {max_retries} attempts to call LLM failed. "
        f"Last error: {type(last_exception).__name__ if last_exception else 'Unknown'}: {last_exception}\n"
        f"Traceback: {traceback.format_exc() if last_exception else 'No traceback available'}"
    )
    raise RuntimeError(
        f"All {max_retries} attempts to call LLM failed for '{task_description}'. "
        f"Last error: {type(last_exception).__name__ if last_exception else 'Unknown'}: {last_exception}"
    )


def delegate_task(
    task_description: str,
    llm_client: Any,
    max_retries: int = 3,
    retry_delay: float = 1.0,
    fallback_value: Optional[Any] = None,
    raise_on_failure: bool = False,
) -> Any:
    """
    Delegate a task to an LLM API with retry and fallback logic.
    
    Wraps the LLM API call in try/except to prevent API failures from crashing
    the pipeline. By default, returns a fallback value on failure instead of
    raising, ensuring the pipeline continues gracefully.
    
    Args:
        task_description: The description of the task to delegate.
        llm_client: The LLM client used to make API calls.
        max_retries: Maximum number of retry attempts on failure.
        retry_delay: Delay (in seconds) between retry attempts.
        fallback_value: The value to return if the LLM call fails after all retries.
                       Defaults to None.
        raise_on_failure: If True, re-raise the exception on failure instead of
                          returning the fallback value. Defaults to False.
    
    Returns:
        The result from the LLM API, or fallback_value if the call fails and
        raise_on_failure is False.
    
    Note:
        When fallback_value is None and raise_on_failure is False, the returned
        None may be indistinguishable from a legitimate None output. A prominent
        warning is logged in this case. Callers should either set
        raise_on_failure=True or provide a non-None, sentinel fallback_value
        (e.g., a dedicated _DELEGATION_FAILED sentinel) to reliably detect
        failures.
    """
    logger.info(f"Delegating task to LLM: {task_description}")
    try:
        result = call_llm(llm_client, task_description, max_retries=max_retries, retry_delay=retry_delay)
        logger.info("Task delegation succeeded.")
        return result
    except Exception as e:
        # Always log the exception with full details before deciding how to handle it.
        # This ensures failures are never silently masked.
        logger.error(
            f"Task delegation FAILED for '{task_description}': {type(e).__name__}: {e}. "
            f"This exception is being handled and a fallback value will be returned. "
            f"raise_on_failure={raise_on_failure}, fallback_value={fallback_value!r}.\n"
            f"Traceback: {traceback.format_exc()}"
        )
        if raise_on_failure:
            logger.error(f"Re-raising exception for '{task_description}' as raise_on_failure=True.")
            raise
        if fallback_value is None:
            # Explicitly log at ERROR level to avoid masking the failure.
            # Returning None as a fallback is a potential silent failure because
            # callers cannot distinguish it from a legitimate None output.
            logger.error(
                f"SILENT FAILURE WARNING: Returning fallback value of None for '{task_description}'. "
                "None fallback may mask failures since it is indistinguishable from no output. "
                "Consider setting raise_on_failure=True or providing a non-None sentinel fallback_value."
            )
        else:
            logger.info(
                f"Returning non-None fallback value for '{task_description}': {fallback_value!r}."
            )
        return fallback_value
