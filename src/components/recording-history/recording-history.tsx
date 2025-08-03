import { useState, useEffect } from 'react';

interface IRecordingData {
  id: string;
  date: Date;
  duration: number;
  chunks: number;
  avgNoiseReduction: number;
}

// React component that fetches recording history
export default function RecordingHistory() {
  const [recordings, setRecordings] = useState<IRecordingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getRecordingHistory().then((data) => {
      setRecordings(data);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return <div className="recording-history loading">Loading recordings...</div>;
  }
  
  return (
    <div className="recording-history">
      <h3>Recording History</h3>
      <div className="history-list">
        {recordings.map(recording => (
          <RecordingItem 
            key={recording.id} 
            recording={recording} 
            onDelete={(id) => setRecordings(prev => prev.filter(r => r.id !== id))}
          />
        ))}
      </div>
    </div>
  );
}

// Client component for interactive parts
function RecordingItem({ recording, onDelete }: { recording: IRecordingData; onDelete: (id: string) => void }) {
  const handleDelete = () => {
    // In a real app, this would delete from database
    console.log('Deleting recording:', recording.id);
    onDelete(recording.id);
  };
  
  return (
    <div className="recording-item">
      <div className="recording-info">
        <span className="recording-date">{recording.date.toLocaleDateString()}</span>
        <span className="recording-duration">{recording.duration}s</span>
        <span className="recording-chunks">{recording.chunks} chunks</span>
        <span className="recording-reduction">{recording.avgNoiseReduction}% reduction</span>
      </div>
      <button onClick={handleDelete} className="btn-delete">Delete</button>
    </div>
  );
}

// Server-side data fetching
async function getRecordingHistory(): Promise<IRecordingData[]> {
  // In a real app, this would fetch from database
  await new Promise(resolve => setTimeout(resolve, 50));
  
  return [
    {
      id: 'rec-1',
      date: new Date('2025-01-15'),
      duration: 120,
      chunks: 15,
      avgNoiseReduction: 78.5
    },
    {
      id: 'rec-2',
      date: new Date('2025-01-14'),
      duration: 95,
      chunks: 12,
      avgNoiseReduction: 82.3
    },
    {
      id: 'rec-3',
      date: new Date('2025-01-13'),
      duration: 150,
      chunks: 19,
      avgNoiseReduction: 75.1
    }
  ];
}