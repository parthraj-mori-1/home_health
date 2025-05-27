// src/App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css'; // Keep this if you want to customize styles

const App = () => {
  const [s3Paths, setS3Paths] = useState(`s3://chartmate-idp1/Ayrom.WC1.pdf\ns3://chartmate-idp1/Ayrom.WC2.pdf`);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    const links = s3Paths
      .split('\n')
      .map(line => line.trim())
      .filter(line => line);

    if (links.length === 0) {
      setError('Please enter at least one S3 path.');
      return;
    }

    setLoading(true);
    setError(null);
    setJobId(null);
    setStatus(null);

    try {
      const response = await axios.post(
      process.env.REACT_APP_SUBMIT_API_URL,
      { links },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

      if (response.status === 200) {
        setJobId(response.data.job_id);
        setPolling(true);
      } else {
        setError(`Submission failed: ${response.statusText}`);
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!jobId || !polling) return;

    const pollStatus = async (attempt = 0) => {
      if (attempt >= 6) {
        setError('Job still in progress. Please check again later.');
        setPolling(false);
        return;
      }

      try {
        const res = await axios.post(
          process.env.REACT_APP_STATUS_API_URL,
          { job_id: jobId },
          { headers: { 'Content-Type': 'application/json' } }
        );

        if (res.status === 200) {
          setStatus(res.data);
          setPolling(false);
        } else if (res.status === 202) {
          setTimeout(() => pollStatus(attempt + 1), attempt === 0 ? 6000 : 15000);
        } else {
          setError(`Status check failed: ${res.statusText}`);
          setPolling(false);
        }
      } catch (err) {
        setError(`Polling error: ${err.message}`);
        setPolling(false);
      }
    };

    pollStatus();
  }, [jobId, polling]);

  return (
    <div className="app" style={{ padding: 20, fontFamily: 'Arial' }}>
      <h1>📄 Home Healthcare Referral</h1>
      <textarea
        rows={6}
        style={{ width: '100%', marginBottom: '10px' }}
        value={s3Paths}
        onChange={(e) => setS3Paths(e.target.value)}
        placeholder="Enter one S3 path per line"
      />
      <button onClick={handleSubmit} disabled={loading} style={{ padding: '10px 20px' }}>
        {loading ? 'Submitting...' : 'Submit'}
      </button>

      {jobId && <p>✅ Job submitted! Job ID: <code>{jobId}</code></p>}
      {polling && <p>⏳ Checking job status...</p>}
      {error && <p style={{ color: 'red' }}>❌ {error}</p>}
      {status && (
        <div>
          <h3>🎉 Job Completed</h3>
          <pre>{JSON.stringify(status, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default App;
