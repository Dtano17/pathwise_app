import VoiceInput from '../VoiceInput';

export default function VoiceInputExample() {
  const handleSubmit = (text: string) => {
    console.log('Goal submitted:', text);
    // Simulate AI processing
    setTimeout(() => {
      console.log('AI generated action plan for:', text);
    }, 2000);
  };

  return (
    <VoiceInput 
      onSubmit={handleSubmit}
      placeholder="Tell me your goals... (e.g., 'I want to exercise more, eat healthier, and read daily')"
    />
  );
}