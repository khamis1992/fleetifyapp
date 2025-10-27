# Voice Input Quick Reference Guide

## For Developers

### Quick Start - Add Voice Input to Any Form Field

```tsx
import { VoiceInput } from '@/components/mobile';

// In your component
<VoiceInput
  value={fieldValue}
  onTranscript={(transcript) => setFieldValue(transcript)}
  language="ar-SA"
  compact
/>
```

### Component Props

#### VoiceInput Component
```typescript
interface VoiceInputProps {
  value?: string;              // Current field value
  onTranscript: (text: string) => void;  // Callback with transcript
  language?: 'ar-SA' | 'en-US';  // Default: 'ar-SA'
  allowLanguageSwitch?: boolean;  // Show language selector
  compact?: boolean;           // Icon-only mode
  disabled?: boolean;          // Disable button
  className?: string;          // Custom styling
}
```

### Hook Usage

#### useVoiceInput
```typescript
import { useVoiceInput } from '@/hooks/useVoiceInput';

const {
  isRecording,
  transcript,
  startRecording,
  stopRecording,
} = useVoiceInput({
  language: 'ar-SA',
  onResult: (result) => console.log(result.transcript),
  onError: (error) => console.error(error),
});
```

#### useVoiceCommands
```typescript
import { useVoiceCommands } from '@/hooks/useVoiceCommands';

const { processCommand } = useVoiceCommands({
  language: 'ar-SA',
  onCommandExecuted: (cmd) => console.log('Executed:', cmd),
});

// Process transcript
const handled = processCommand(transcript);
```

### Integration Examples

#### React Hook Form
```tsx
<FormField
  control={form.control}
  name="notes"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Notes</FormLabel>
      <FormControl>
        <div className="space-y-2">
          <Textarea {...field} />
          <VoiceInput
            value={field.value}
            onTranscript={(text) => field.onChange(text)}
            compact
          />
        </div>
      </FormControl>
    </FormItem>
  )}
/>
```

#### Standard State
```tsx
const [notes, setNotes] = useState('');

<div className="space-y-2">
  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
  <VoiceInput
    value={notes}
    onTranscript={setNotes}
    compact
  />
</div>
```

## For Users

### How to Use Voice Input

1. **Find the microphone icon** next to text fields
2. **Click the microphone button**
3. **First time only:** Accept privacy policy
4. **Allow microphone access** when browser asks
5. **Start speaking** clearly
6. **Watch the waveform** animation while recording
7. **See your words** appear in real-time
8. **Click stop** or wait for auto-stop
9. **Review and edit** the text if needed

### Supported Voice Commands

#### Arabic Commands
- "افتح لوحة التحكم" - Open dashboard
- "اذهب إلى العقود" - Go to contracts
- "اذهب إلى العملاء" - Go to customers
- "اذهب إلى الأسطول" - Go to fleet
- "اذهب إلى المالية" - Go to finance
- "أضف عقد جديد" - Add new contract
- "أضف عميل جديد" - Add new customer

#### English Commands
- "Open dashboard"
- "Go to contracts"
- "Go to customers"
- "Go to fleet"
- "Go to finance"
- "Add new contract"
- "Add new customer"

### Where Voice Input is Available

1. **Customer Forms**
   - Customer notes field

2. **Contract Forms**
   - Contract description
   - Contract terms

3. **Vehicle Forms**
   - Driver side notes
   - Passenger side notes
   - Additional notes
   - Inspection notes

### Tips for Best Results

✅ **Do:**
- Speak clearly and at normal pace
- Use in quiet environment
- Review transcript before saving
- Position microphone properly
- Use for long text entry

❌ **Don't:**
- Speak too fast or too slow
- Use in noisy environments
- Rely solely on voice (always review)
- Expect 100% accuracy
- Use offline (needs internet)

### Privacy & Security

- ✅ Processing happens in your browser
- ✅ No audio files stored
- ✅ Only text transcript saved
- ✅ Same security as typed text
- ⚠️ Browser may use Google Speech API

### Troubleshooting

**Issue:** Microphone button doesn't work
- **Solution:** Check browser compatibility (Chrome/Edge recommended)

**Issue:** Permission denied
- **Solution:** Enable microphone in browser settings

**Issue:** No speech detected
- **Solution:** Speak louder or check microphone

**Issue:** Poor accuracy
- **Solution:** Reduce background noise, speak clearly

**Issue:** Privacy dialog keeps appearing
- **Solution:** Clear browser cache, accept again

### Browser Compatibility

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome | ✅ Full | Recommended |
| Edge | ✅ Full | Recommended |
| Safari | ⚠️ Limited | May require webkit |
| Firefox | ⚠️ Limited | Experimental support |
| Mobile Chrome | ✅ Full | Works well |
| Mobile Safari | ⚠️ Limited | May have issues |

## Testing Checklist

### Manual Testing
- [ ] Click microphone button
- [ ] Accept privacy consent (first time)
- [ ] Allow microphone permission
- [ ] Speak test phrase
- [ ] Verify transcript appears
- [ ] Check text inserted to field
- [ ] Test stop button
- [ ] Test language switch
- [ ] Test error handling (deny permission)
- [ ] Test in multiple browsers

### Voice Commands Testing
- [ ] Test each Arabic command
- [ ] Test each English command
- [ ] Verify navigation works
- [ ] Check toast notifications

### Form Integration Testing
- [ ] Customer form notes
- [ ] Contract description
- [ ] Contract terms
- [ ] Vehicle handover notes (all 3 fields)
- [ ] Vehicle inspection notes

## Common Issues & Solutions

### Development Issues

**Import Error:**
```typescript
// ❌ Wrong
import { VoiceInput } from '@/components/mobile/VoiceInput';

// ✅ Correct
import { VoiceInput } from '@/components/mobile';
```

**Type Error:**
```typescript
// ❌ Wrong - missing required prop
<VoiceInput value={text} />

// ✅ Correct - all required props
<VoiceInput value={text} onTranscript={setText} />
```

**Consent Not Working:**
```typescript
// Check localStorage
localStorage.getItem('voice_privacy_consent');

// Clear consent (for testing)
localStorage.removeItem('voice_privacy_consent');
```

### User Issues

**No microphone access:**
1. Check browser permissions
2. Go to browser settings
3. Site permissions → Microphone
4. Allow access

**Speech not detected:**
1. Check microphone is working
2. Test in other apps
3. Adjust microphone volume
4. Reduce background noise

**Wrong language detected:**
1. Select correct language from dropdown
2. Arabic: ar-SA
3. English: en-US

## API Reference

### Helper Functions

```typescript
import {
  isSpeechRecognitionSupported,
  getSpeechRecognition,
  getBrowserCompatibility,
  getSupportedLanguages,
  formatLanguageName,
  checkMicrophonePermission,
  requestMicrophoneAccess,
  getVoicePrivacyConsent,
  saveVoicePrivacyConsent,
  hasValidConsent,
  cleanTranscript,
  parseVoiceCommand,
  getSpeechErrorMessage,
  formatDuration,
  shouldEnableVoiceInput,
} from '@/utils/voiceInputHelpers';
```

### Type Definitions

```typescript
import type {
  VoiceLanguage,
  VoiceInputConfig,
  VoiceInputResult,
  VoiceInputState,
  VoiceCommand,
  VoicePrivacyConsent,
} from '@/types/mobile';
```

## Support

### For Developers
- Check TypeScript types in `@/types/mobile.ts`
- Review helper functions in `@/utils/voiceInputHelpers.ts`
- See implementation examples in integrated forms
- Read full summary in `VOICE_INPUT_IMPLEMENTATION_SUMMARY.md`

### For Users
- Contact support if microphone doesn't work
- Report accuracy issues with examples
- Suggest new voice commands
- Request additional languages

---

**Last Updated:** October 27, 2025
**Version:** 1.0.0
