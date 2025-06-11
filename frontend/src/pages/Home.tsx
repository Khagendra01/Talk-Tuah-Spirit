import React from 'react';
import { Search, Plus, X } from 'lucide-react';
import MemorialCard from '../components/MemorialCard';
import { S3Client } from '@aws-sdk/client-s3';
import axios from 'axios';
import { Upload } from '@aws-sdk/lib-storage';

// Initialize the S3 client
const s3Client = new S3Client({
  region: import.meta.env.VITE_AWS_REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
});

interface Memorial {
  _id: string;
  name: string;
  image: string;
  birth: string;
  death: string;
  voice: string;
  bio: string;
}

const Home = () => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [newMemorial, setNewMemorial] = React.useState({
    name: '',
    birth: '',
    death: '',
    image: null as File | null,
    bio: '',
    isAlive: false,
    voice: null as File | null,
  });

  const [memorials, setMemorials] = React.useState<Memorial[]>([]); // State to store fetched memorials
  const fetchMemorials = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/getmemorials`);
      setMemorials(response.data.data);
      console.log(response.data.data);
    } catch (error) {
      console.error('Error fetching memorials:', error);
    }
  };


  React.useEffect(() => {
    fetchMemorials(); 
  }, []);

  const filteredMemorials = memorials.filter(memorial =>
    memorial.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const uploadFileToS3 = async (file: File, folder: string) => {
    const key = `${folder}/${Date.now()}_${file.name}`; // Unique file name
    const params = {
      Bucket: import.meta.env.VITE_AWS_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: file.type,
    };
  
    try {
      const upload = new Upload({
        client: s3Client,
        params,
      });
  
      const result = await upload.done();
      return result.Location; // Public URL of the uploaded file
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw error;
    }
  };

  const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
  const ELEVENLABS_VOICE_CLONE_ENDPOINT = 'https://api.elevenlabs.io/v1/voices/add';

const cloneVoice = async (audioFile: any, name: string, description: string) => {
  const formData = new FormData();
  formData.append('files', audioFile);
  formData.append('name', name);
  formData.append('description', description);

  try {
    const response = await axios.post(ELEVENLABS_VOICE_CLONE_ENDPOINT, formData, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.voice_id; // Return the cloned voice ID
  } catch (error) {
    console.error('Error cloning voice:', error);
    throw error;
  }
};

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const imageUrl = newMemorial.image
        ? await uploadFileToS3(newMemorial.image, 'images')
        : null;
      //const voiceID = await cloneVoice(newMemorial.voice, newMemorial.name, newMemorial.bio);
      const voiceID = 234234;
      // Prepare data to send to the backend
      const memorialData = {
        name: newMemorial.name,
        birth: newMemorial.birth,
        death: newMemorial.death,
        image: imageUrl,
        bio: newMemorial.bio,
        isAlive: newMemorial.isAlive,
        voice: voiceID,
      };

      // Send data to Flask backend
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/addmemorials`, memorialData);
      console.log('Memorial created:', response.data);

      // Reset form and close modal
      setShowAddModal(false);
      setNewMemorial({
        name: '',
        birth: '',
        death: '',
        image: null,
        bio: '',
        isAlive: false,
        voice: null,
      });
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

 
  return (
    <div className="pt-16">

      <div className="relative h-[60vh] flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1501526029524-a8ea952b15be?auto=format&fit=crop&q=80')] bg-cover bg-center">
        <div className="absolute inset-0 bg-black/70"></div>
        <div className="relative text-center space-y-4 px-4">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            Where your loved ones remain
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Connect with the spirits of those who've passed through our ethereal gateway
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search memorials..."
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="ml-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Add Memorial</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMemorials.map(memorial => (
            <MemorialCard key={memorial._id} {...memorial} />
          ))}
        </div>
      </div>

      {/* Add Memorial Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Add New Memorial</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newMemorial.name}
                  onChange={(e) => setNewMemorial({...newMemorial, name: e.target.value})}
                  className="w-full p-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>


              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Birth Date
                  </label>
                  <input
                    type="date"
                    value={newMemorial.birth}
                    onChange={(e) => setNewMemorial({...newMemorial, birth: e.target.value})}
                    className="w-full p-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Death Date
                  </label>
                  <input
                    type="date"
                    value={newMemorial.death}
                    onChange={(e) => setNewMemorial({...newMemorial, death: e.target.value})}
                    className="w-full p-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    disabled={newMemorial.isAlive} // Disable if "Is Alive" is checked
                    required={!newMemorial.isAlive} // Not required if "Is Alive" is checked
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setNewMemorial({...newMemorial, image: e.target.files[0]});
                    }
                  }}
                  className="w-full p-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Voice (Optional)
                </label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setNewMemorial({...newMemorial, voice: e.target.files[0]});
                    }
                  }}
                  className="w-full p-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Biography
                </label>
                <textarea
                  value={newMemorial.bio}
                  onChange={(e) => setNewMemorial({...newMemorial, bio: e.target.value})}
                  className="w-full p-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent h-32 resize-none"
                  required
                ></textarea>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  Create Memorial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;