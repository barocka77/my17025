import { useState } from 'react';
import PersonnelListView from './PersonnelListView';
import PersonnelDetailView from './PersonnelDetailView';

export default function PersonnelView() {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  if (selectedProfileId) {
    return (
      <PersonnelDetailView
        profileId={selectedProfileId}
        onBack={() => setSelectedProfileId(null)}
      />
    );
  }

  return <PersonnelListView onSelectProfile={setSelectedProfileId} />;
}
