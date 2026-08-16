// Dynamic Admin Configuration (Strictly controlled by Firestore `config/batch` document)
// All authorized admin emails and security PIN are dynamically queried from `doc(db, 'config', 'batch')`.

export const CONFIG_COLLECTION = 'config';
export const BATCH_CONFIG_DOC = 'batch';
