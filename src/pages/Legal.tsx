// Redirect to Legal Cases page
import { Navigate } from 'react-router-dom';

const Legal = () => {
  return <Navigate to="/legal/cases" replace />;
};

export default Legal;
