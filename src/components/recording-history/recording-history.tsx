'use server';

import { revalidatePath } from 'next/cache';

interface IRecordingData {
  id: string;
  date: Date;
  duration: number;
  chunks: number;
  avgNoiseReduction: number;
}

// Server component that fetches recording history
export default async function RecordingHistory() {
  const recordings = await getRecordingHistory();
  
  return (
    <div className="recording-history">
      <h3>Recording History</h3>
      <div className="history-list">
        {recordings.map(recording => (
          <RecordingItem key={recording.id} recording={recording} />
        ))}
      </div>
    </div>
  );
}

// Client component for interactive parts
function RecordingItem({ recording }: { recording: IRecordingData }) {
  async function deleteRecording(formData: FormData) {
    'use server';
    
    const id = formData.get('id') as string;
    
    // In a real app, this would delete from database
    console.log('Deleting recording:', id);
    
    // Revalidate the page to show updated data
    revalidatePath('/recordings');
  }
  
  return (
    <div className="recording-item">
      <div className="recording-info">
        <span className="recording-date">{recording.date.toLocaleDateString()}</span>
        <span className="recording-duration">{recording.duration}s</span>
        <span className="recording-chunks">{recording.chunks} chunks</span>
        <span className="recording-reduction">{recording.avgNoiseReduction}% reduction</span>
      </div>
      <form action={deleteRecording}>
        <input type="hidden" name="id" value={recording.id} />
        <button type="submit" className="btn-delete">Delete</button>
      </form>
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