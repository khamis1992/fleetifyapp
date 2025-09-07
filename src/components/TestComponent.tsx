import * as React from 'react';

export const TestComponent: React.FC = () => {
  const [test, setTest] = React.useState(false);
  
  return (
    <div>
      <p>Test: {test ? 'true' : 'false'}</p>
      <button onClick={() => setTest(!test)}>Toggle</button>
    </div>
  );
};