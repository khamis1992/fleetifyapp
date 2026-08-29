-- Trigger لملء قيمة المطالبة كتابتاً تلقائياً
CREATE OR REPLACE FUNCTION auto_fill_claim_amount_words()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.claim_amount IS NOT NULL AND (NEW.claim_amount_words IS NULL OR NEW.claim_amount_words = '') THEN
    NEW.claim_amount_words := number_to_arabic_words(NEW.claim_amount);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_fill_claim_words_trigger ON lawsuit_templates;
CREATE TRIGGER auto_fill_claim_words_trigger
  BEFORE INSERT OR UPDATE ON lawsuit_templates
  FOR EACH ROW
  EXECUTE FUNCTION auto_fill_claim_amount_words();

GRANT EXECUTE ON FUNCTION auto_fill_claim_amount_words TO authenticated;

COMMENT ON FUNCTION auto_fill_claim_amount_words IS 'ملء قيمة المطالبة كتابتاً تلقائياً';
COMMENT ON TRIGGER auto_fill_claim_words_trigger ON lawsuit_templates IS 'يملأ claim_amount_words تلقائياً';;
