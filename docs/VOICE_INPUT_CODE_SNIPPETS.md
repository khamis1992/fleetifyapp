# Voice Input Implementation - Key Code Snippets

## Component Usage Examples

### 1. Compact Mode (Icon Only)
```tsx
import { VoiceInput } from '@/components/mobile';

<VoiceInput
  value={notes}
  onTranscript={(transcript) => setNotes(transcript)}
  language="ar-SA"
  compact
  className="flex justify-end"
/>
```

### 2. Full Mode with Language Selector
```tsx
<VoiceInput
  value={description}
  onTranscript={(transcript) => setDescription(transcript)}
  allowLanguageSwitch
/>
```

### 3. Integration with React Hook Form
```tsx
<FormField
  control={form.control}
  name="notes"
  render={({ field }) => (
    <FormItem>
      <FormLabel>ملاحظات</FormLabel>
      <FormControl>
        <div className="space-y-2">
          <Textarea {...field} placeholder="أدخل ملاحظات" rows={3} />
          <VoiceInput
            value={field.value || ''}
            onTranscript={(transcript) => field.onChange(transcript)}
            language="ar-SA"
            compact
            className="flex justify-end"
          />
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

## Hook Usage Examples

### 1. Basic Voice Input
```tsx
import { useVoiceInput } from '@/hooks/useVoiceInput';

function MyComponent() {
  const {
    isSupported,
    isRecording,
    transcript,
    error,
    startRecording,
    stopRecording,
  } = useVoiceInput({
    language: 'ar-SA',
    onResult: (result) => {
      console.log('Transcript:', result.transcript);
      console.log('Confidence:', result.confidence);
    },
  });

  if (!isSupported) {
    return <div>Voice input not supported</div>;
  }

  return (
    <div>
      <button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop' : 'Start'} Recording
      </button>
      {transcript && <p>You said: {transcript}</p>}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
```

### 2. Voice Commands Integration
```tsx
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';

function NavigationWithVoice() {
  const { processCommand } = useVoiceCommands({
    language: 'ar-SA',
    onCommandExecuted: (command) => {
      console.log('Executed command:', command);
    },
  });

  const { transcript } = useVoiceInput({
    language: 'ar-SA',
    onResult: (result) => {
      if (result.isFinal) {
        const handled = processCommand(result.transcript);
        if (handled) {
          console.log('Command processed');
        } else {
          console.log('Not a command, regular text');
        }
      }
    },
  });

  return <div>Say: "افتح لوحة التحكم"</div>;
}
```

## Helper Functions Examples

### 1. Check Browser Support
```tsx
import { isSpeechRecognitionSupported, getBrowserCompatibility } from '@/utils/voiceInputHelpers';

function VoiceInputSetup() {
  const isSupported = isSpeechRecognitionSupported();
  const { browser, supported } = getBrowserCompatibility();

  if (!supported) {
    return (
      <Alert>
        <AlertDescription>
          Voice input is not supported in {browser}.
          Please use Chrome or Edge.
        </AlertDescription>
      </Alert>
    );
  }

  return <VoiceInputComponent />;
}
```

### 2. Check and Request Permissions
```tsx
import {
  checkMicrophonePermission,
  requestMicrophoneAccess
} from '@/utils/voiceInputHelpers';

async function setupMicrophone() {
  // Check current permission
  const permission = await checkMicrophonePermission();

  if (permission === 'denied') {
    console.error('Microphone access denied');
    return false;
  }

  if (permission !== 'granted') {
    // Request access
    const granted = await requestMicrophoneAccess();
    return granted;
  }

  return true;
}
```

### 3. Privacy Consent Management
```tsx
import {
  hasValidConsent,
  getVoicePrivacyConsent,
  saveVoicePrivacyConsent
} from '@/utils/voiceInputHelpers';

function VoiceInputWithConsent() {
  const [showConsentDialog, setShowConsentDialog] = useState(false);

  const handleStartRecording = () => {
    if (!hasValidConsent()) {
      setShowConsentDialog(true);
      return;
    }
    // Start recording...
  };

  const handleConsent = (granted: boolean) => {
    saveVoicePrivacyConsent(granted);
    if (granted) {
      // Start recording...
    }
  };

  return (
    <>
      <button onClick={handleStartRecording}>Record</button>
      <VoicePrivacyDialog
        open={showConsentDialog}
        onOpenChange={setShowConsentDialog}
        onConsent={handleConsent}
      />
    </>
  );
}
```

### 4. Parse Voice Commands
```tsx
import { parseVoiceCommand } from '@/utils/voiceInputHelpers';

function handleTranscript(transcript: string, language: 'ar-SA' | 'en-US') {
  const { command, params } = parseVoiceCommand(transcript, language);

  switch (command) {
    case 'navigate_dashboard':
      navigate('/');
      break;
    case 'navigate_contracts':
      navigate('/contracts');
      break;
    case 'search':
      const query = params[0];
      navigate(`/search?q=${query}`);
      break;
    default:
      // Not a command, treat as regular input
      console.log('Regular text:', transcript);
  }
}
```

### 5. Clean and Format Transcript
```tsx
import { cleanTranscript, formatDuration } from '@/utils/voiceInputHelpers';

function TranscriptDisplay({ rawTranscript, recordingSeconds }) {
  const cleanedText = cleanTranscript(rawTranscript);
  const duration = formatDuration(recordingSeconds);

  return (
    <div>
      <p>Duration: {duration}</p>
      <p>Transcript: {cleanedText}</p>
    </div>
  );
}
```

## Custom Voice Input Component

### Building a Custom Component
```tsx
import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceInput } from '@/hooks/useVoiceInput';

interface CustomVoiceInputProps {
  onTextReceived: (text: string) => void;
}

function CustomVoiceInput({ onTextReceived }: CustomVoiceInputProps) {
  const [language, setLanguage] = useState<'ar-SA' | 'en-US'>('ar-SA');

  const {
    isSupported,
    isRecording,
    transcript,
    error,
    duration,
    startRecording,
    stopRecording,
  } = useVoiceInput({
    language,
    onResult: (result) => {
      if (result.isFinal) {
        onTextReceived(result.transcript);
      }
    },
  });

  if (!isSupported) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="icon"
        variant={isRecording ? 'destructive' : 'outline'}
        onClick={isRecording ? stopRecording : startRecording}
      >
        {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>

      {isRecording && (
        <div className="flex items-center gap-2">
          <div className="animate-pulse h-2 w-2 bg-red-500 rounded-full" />
          <span className="text-sm">{formatDuration(duration)}</span>
        </div>
      )}

      {transcript && (
        <span className="text-sm text-muted-foreground">
          {transcript}
        </span>
      )}

      {error && (
        <span className="text-sm text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}
```

## Advanced Usage

### 1. Multi-Language Support
```tsx
import { useState } from 'react';
import { VoiceInput } from '@/components/mobile';
import { Select } from '@/components/ui/select';

function MultiLanguageForm() {
  const [language, setLanguage] = useState<'ar-SA' | 'en-US'>('ar-SA');
  const [text, setText] = useState('');

  return (
    <div className="space-y-4">
      <Select value={language} onValueChange={setLanguage}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ar-SA">العربية</SelectItem>
          <SelectItem value="en-US">English</SelectItem>
        </SelectContent>
      </Select>

      <Textarea value={text} onChange={(e) => setText(e.target.value)} />

      <VoiceInput
        value={text}
        onTranscript={setText}
        language={language}
        compact
      />
    </div>
  );
}
```

### 2. Continuous Recording
```tsx
function ContinuousVoiceInput() {
  const [fullTranscript, setFullTranscript] = useState('');

  const { isRecording, startRecording, stopRecording } = useVoiceInput({
    language: 'ar-SA',
    continuous: true,  // Keep recording
    interimResults: true,
    onResult: (result) => {
      if (result.isFinal) {
        // Append to full transcript
        setFullTranscript((prev) => prev + ' ' + result.transcript);
      }
    },
  });

  return (
    <div>
      <Button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop' : 'Start'} Continuous Recording
      </Button>
      <div className="mt-4 p-4 bg-muted rounded">
        {fullTranscript}
      </div>
    </div>
  );
}
```

### 3. Real-time Feedback
```tsx
function RealtimeVoiceInput() {
  const [interim, setInterim] = useState('');
  const [final, setFinal] = useState('');

  useVoiceInput({
    language: 'ar-SA',
    interimResults: true,
    onResult: (result) => {
      if (result.isFinal) {
        setFinal((prev) => prev + ' ' + result.transcript);
        setInterim('');
      } else {
        setInterim(result.transcript);
      }
    },
  });

  return (
    <div className="space-y-2">
      <div className="p-4 bg-muted rounded">
        <p className="font-semibold">Final:</p>
        <p>{final}</p>
      </div>
      <div className="p-4 bg-muted/50 rounded">
        <p className="font-semibold">Interim (real-time):</p>
        <p className="italic">{interim}</p>
      </div>
    </div>
  );
}
```

## Error Handling Patterns

### 1. Graceful Degradation
```tsx
function VoiceInputWithFallback() {
  const { isSupported, error } = useVoiceInput({
    language: 'ar-SA',
    onError: (err) => {
      console.error('Voice input error:', err);
      toast.error(err);
    },
  });

  if (!isSupported) {
    return (
      <Alert>
        <AlertDescription>
          Voice input is not available. Please type manually.
        </AlertDescription>
      </Alert>
    );
  }

  return <VoiceInput {...props} />;
}
```

### 2. Permission Error Handling
```tsx
async function handleStartRecording() {
  const permission = await checkMicrophonePermission();

  if (permission === 'denied') {
    toast.error('Microphone access denied. Please enable in browser settings.');
    return;
  }

  if (permission !== 'granted') {
    const granted = await requestMicrophoneAccess();
    if (!granted) {
      toast.error('Cannot access microphone. Please check permissions.');
      return;
    }
  }

  // Start recording
  await startRecording();
}
```

## Testing Utilities

### 1. Mock Voice Input for Testing
```tsx
// For unit tests
const mockUseVoiceInput = () => ({
  isSupported: true,
  isRecording: false,
  transcript: '',
  error: null,
  duration: 0,
  startRecording: jest.fn(),
  stopRecording: jest.fn(),
  toggleRecording: jest.fn(),
  clearTranscript: jest.fn(),
  clearError: jest.fn(),
});
```

### 2. Test Helper
```tsx
function TestVoiceInput() {
  const [log, setLog] = useState<string[]>([]);

  const { isRecording, transcript, startRecording, stopRecording } = useVoiceInput({
    language: 'ar-SA',
    onResult: (result) => {
      setLog((prev) => [...prev, `Result: ${result.transcript}`]);
    },
    onError: (error) => {
      setLog((prev) => [...prev, `Error: ${error}`]);
    },
    onStart: () => {
      setLog((prev) => [...prev, 'Recording started']);
    },
    onEnd: () => {
      setLog((prev) => [...prev, 'Recording ended']);
    },
  });

  return (
    <div className="space-y-4">
      <Button onClick={isRecording ? stopRecording : startRecording}>
        {isRecording ? 'Stop' : 'Start'}
      </Button>

      <div className="p-4 bg-muted rounded font-mono text-sm">
        {log.map((entry, i) => (
          <div key={i}>{entry}</div>
        ))}
      </div>
    </div>
  );
}
```

---

**Note:** These snippets are ready to use. Copy and paste them into your components, adjusting as needed for your specific use case.
