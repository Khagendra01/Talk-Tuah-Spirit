import React, { useState, useEffect, memo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Phone, PhoneOff, MessageSquare, Share2, Heart, Candy as Candle, X, Send } from 'lucide-react';
import { ElevenLabsClient } from "elevenlabs";
import axios from 'axios';

interface Memorial {
  _id: string
  name: string;
  image: string;
  birth: string;
  death: string;
  voice: string;
  bio: string;
}

interface Message {
  sender: string;
  text: string;
}

// Add new interface for Tribute
interface Tribute {
  name: string;
  message: string;
  has_candle: boolean;
  has_love: boolean;
  created_at: string;
}

const MemorialProfile = () => {
  const location = useLocation();
  const [memorial, setMemorial] = useState<Memorial | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [showCallAnswer, setShowCallAnswer] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [voices, setVoices] = useState<Message[]>([]);
  const [tribute, setTribute] = useState('');
  const [transcript, setTranscript] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const client = new ElevenLabsClient({ 
    apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY 
  });
  const [hasLitCandle, setHasLitCandle] = useState(false);
  const [hasSentLove, setHasSentLove] = useState(false);
  const [tributeName, setTributeName] = useState('');
  const [tributes, setTributes] = useState<Tribute[]>([]);
  const [showFullBio, setShowFullBio] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  
  // First useEffect for memorial state
  useEffect(() => {
    const { _id, name, image, birth, death, voice, bio } = location.state;
    setMemorial({ _id, name, image, birth, death, voice, bio });
  }, [location.state]);

  const handleCallAPI = async(txt: string): Promise<string | null> => {
    if (txt.trim()) {
      try {
        const response = await axios.post('https://crystalmath.pythonanywhere.com/api/sendmsg', {
          did: memorial?._id,
          question: txt,
          past_convo: voices.map(msg => `${msg.sender}: ${msg.text}`).join('\n'),
          name: memorial?.name
        });
        setVoices(prevMessages => [...prevMessages, 
          { sender: "User", text: txt },
          { sender: memorial?.name || '', text: response.data.data }
        ]);
        return response.data.data;
      } catch (error) {
        console.error('Error fetching memorials:', error);
        return null;
      }
    }
    return null;
  };

  const playTextToSpeech = async (text: string) => {
    try {
      const response = await client.textToSpeech.convert(
        memorial?.voice || "21m00Tcm4TlvDq8ikWAM",
        {
          output_format: "mp3_44100_128",
          text: text,
          model_id: "eleven_multilingual_v2"
        }
      );

      const chunks = [];
      while (true) {
        const { done, value } = await response.reader.read();
        if (done) break;
        chunks.push(value);
      }

      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const audioData = new Uint8Array(totalLength);
      let position = 0;
      
      for (const chunk of chunks) {
        audioData.set(chunk, position);
        position += chunk.length;
      }

      const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      await audio.play();
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };

    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  // Function to be called when the user is considered "done" speaking
  const onSpeechComplete = async(finalText: string) => {
    console.log('User has completed speaking. Final transcript:', finalText);
    const spich = await handleCallAPI(finalText);
    if (spich) {
      await playTextToSpeech(spich);
      // Restart speech recognition after text-to-speech finishes
      if (recognitionRef.current && isCallActive) {
        recognitionRef.current.start();
      }
    }
  };

  // Second useEffect for speech recognition
  useEffect(() => {
    recognitionRef.current = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    const recognition = recognitionRef.current;
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = async (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let currentFinalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          currentFinalTranscript += transcriptPart + ' ';
        } else {
          interimTranscript += transcriptPart;
        }
      }
    
      console.log('Interim Transcript:', interimTranscript);
    
      if (currentFinalTranscript) {
        setFinalTranscript(prev => {
          const newTranscript = prev + currentFinalTranscript;
          
          // Clear any existing timeout
          if (timeoutIdRef.current) {
            clearTimeout(timeoutIdRef.current);
          }
          
          // Set new timeout
          timeoutIdRef.current = setTimeout(() => {
            if (newTranscript.trim()) {
              onSpeechComplete(newTranscript.trim());
              setFinalTranscript('');
            }
          }, 1000);
          
          return newTranscript;
        });
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (recognition && !isCallActive) {
        recognition.stop();
      }
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      // Only restart if the call is still active
      if (isCallActive && recognition) {
        console.log('Restarting speech recognition...');
        setTimeout(() => {
          try {
            recognition.start();
          } catch (error) {
            console.error('Error restarting recognition:', error);
          }
        }, 1000);
      }
    };

    // Start recognition when the effect runs and isCallActive is true
    if (isCallActive && recognition) {
      try {
        recognition.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
      }
    }

    // Enhanced cleanup function
    return () => {
      if (recognition) {
        try {
          recognition.stop();
          // Remove all event listeners
          recognition.onresult = null;
          recognition.onerror = null;
          recognition.onend = null;
        } catch (error) {
          console.error('Error stopping recognition:', error);
        }
      }
    };
  }, [isCallActive]);

  // Add new useEffect to fetch tributes when memorial loads
  useEffect(() => {
    if (memorial?._id) {
      fetchTributes();
    }
  }, [memorial?._id]);

  const fetchTributes = async () => {
    try {
      const response = await axios.get(`https://crystalmath.pythonanywhere.com/api/tributes/${memorial?._id}`);
      console.log('Fetched tributes:', response.data.tributes);
      setTributes(response.data.tributes);
    } catch (error) {
      console.error('Error fetching tributes:', error);
    }
  };

  if (!memorial) return <div>Memorial not found</div>;

  const handleSendMessage = async() => {
    if (message.trim() && memorial) {
      // Format past conversations into a single string
      const conversationHistory = messages
        .map(msg => `${msg.sender}: ${msg.text}`)
        .join('\n');
        
      try {
        const pathaune = {
          did: memorial._id,
          question: message,
          past_convo: conversationHistory,
          name: memorial.name
        }
        const response = await axios.post('https://crystalmath.pythonanywhere.com/api/sendmsg', pathaune);
        setMessages(prevMessages => [...prevMessages, {
          sender: "User",
          text: message
        }]);
        setMessages(prevMessages => [...prevMessages, {
          sender: memorial.name,
          text: response.data.data
        }]);
      } catch (error) {
        console.error('Error fetching memorials:', error);
      }
      
      setMessage('');
    }
  };

  // Update handlePostTribute to refresh tributes after posting
  const handlePostTribute = async () => {
    if (tribute.trim() && tributeName.trim()) {
      try {
        const tributeData = {
          memorialId: memorial?._id,
          name: tributeName,
          message: tribute,
          has_candle: hasLitCandle,
          has_love: hasSentLove
        };
        
        await axios.post('https://crystalmath.pythonanywhere.com/api/tribute', tributeData);
        
        // Fetch updated tributes
        await fetchTributes();
        
        // Reset all tribute-related states after successful submission
        setTribute('');
        setTributeName('');
        setHasLitCandle(false);
        setHasSentLove(false);
      } catch (error) {
        console.error('Error posting tribute:', error);
      }
    }
  };

  const handleCall = () => {
    setShowCallAnswer(true);
    setTimeout(() => {
      setIsCallActive(true);
      setShowCallAnswer(false);
      // Start recognition only when call becomes active
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    }, 2000);
  };

  const handleEndCall = () => {
    setIsCallActive(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition during call end:', error);
      }
    }
    setTranscript('');
  };

  // Add this helper function to truncate text
  const truncateText = (text: string, wordLimit: number) => {
    const words = text.split(' ');
    if (words.length > wordLimit) {
      return words.slice(0, wordLimit).join(' ') + '...';
    }
    return text;
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Updated hero section */}
      <div className="relative h-[60vh]">
        <img
          src={memorial.image}
          alt={memorial.name}
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-5xl font-bold text-white mb-2">{memorial.name}</h1>
            <p className="text-xl text-gray-300">{memorial.birth} - {memorial.death}</p>
          </div>
        </div>
      </div>

      {/* Updated main content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
              <h1 className="text-4xl font-bold mb-4">{memorial.name}</h1>
              <p className="text-gray-400 mb-6">{memorial.birth} - {memorial.death}</p>
              <div className="text-lg text-gray-300">
                <p>{showFullBio ? memorial.bio : truncateText(memorial.bio, 50)}</p>
                {memorial.bio.split(' ').length > 50 && (
                  <button
                    onClick={() => setShowFullBio(!showFullBio)}
                    className="text-purple-400 hover:text-purple-300 mt-2 text-sm font-medium"
                  >
                    {showFullBio ? 'Show Less' : 'Show More'}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-2xl font-bold mb-6">Tributes</h2>
              <div className="space-y-6">
                {tributes.map((tribute, index) => {
                  console.log('Rendering tribute:', tribute);
                  return (
                    <div key={index} className="bg-gray-700/50 rounded-lg p-4 transition-all hover:bg-gray-700/70">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-gray-200">{tribute.name}</span>
                        <div className="flex items-center gap-4">
                          {tribute.has_candle && (
                            <Candle className="h-8 w-8 text-yellow-400" />
                          )}
                          {tribute.has_love && (
                            <Heart className="h-8 w-8 text-pink-500 fill-pink-500" />
                          )}
                        </div>
                      </div>
                      <p className="text-gray-300 mb-3">{tribute.message}</p>
                      <span className="text-sm text-gray-500">{tribute.created_at}</span>
                    </div>
                  );
                })}
                {tributes.length === 0 && (
                  <p className="text-gray-400 text-center">No tributes yet. Be the first to leave one!</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleCall}
                  className="flex items-center justify-center space-x-2 p-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  disabled={isCallActive}
                >
                  <Phone className="h-5 w-5" />
                  <span>Call Spirit</span>
                </button>
                <button
                  onClick={() => setShowChat(true)}
                  className="flex items-center justify-center space-x-2 p-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  <MessageSquare className="h-5 w-5" />
                  <span>Chat</span>
                </button>
                {isCallActive && (
                  <button
                    onClick={handleEndCall}
                    className="flex items-center justify-center space-x-2 p-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    <PhoneOff className="h-5 w-5" />
                    <span>End Call</span>
                  </button>
                )}
              </div>
              {showCallAnswer && (
                <div className="mt-4 text-center text-gray-400">
                  Connecting to the spirit world...
                </div>
              )}
              {isCallActive && (
                <div className="mt-4 text-center text-green-400">
                  Connected - Spirit is listening...
                </div>
              )}
            </div>

            <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
              <h3 className="text-xl font-bold mb-4">Leave a Tribute</h3>
              <div className="flex space-x-4 mb-4">
                <button 
                  onClick={() => setHasLitCandle(prev => !prev)}
                  className={`flex-1 flex items-center justify-center space-x-2 p-3 rounded-lg transition-colors ${
                    hasLitCandle 
                      ? 'bg-yellow-600 hover:bg-yellow-700' 
                      : 'bg-yellow-600/20 hover:bg-yellow-600/30'
                  }`}
                >
                  <Candle className={`h-5 w-5 ${hasLitCandle ? 'text-white' : 'text-yellow-400'}`} />
                  <span>{hasLitCandle ? 'Candle Lit' : 'Light Candle'}</span>
                </button>
                <button 
                  onClick={() => setHasSentLove(prev => !prev)}
                  className={`flex-1 flex items-center justify-center space-x-2 p-3 rounded-lg transition-colors ${
                    hasSentLove 
                      ? 'bg-pink-600 hover:bg-pink-700' 
                      : 'bg-pink-600/20 hover:bg-pink-600/30'
                  }`}
                >
                  <Heart className={`h-5 w-5 ${hasSentLove ? 'text-white' : 'text-pink-400'}`} />
                  <span>{hasSentLove ? 'Love Sent' : 'Send Love'}</span>
                </button>
              </div>
              <input
                type="text"
                placeholder="Your Full Name"
                value={tributeName}
                onChange={(e) => setTributeName(e.target.value)}
                className="w-full p-3 mb-4 bg-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <textarea
                placeholder="Write your message..."
                value={tribute}
                onChange={(e) => setTribute(e.target.value)}
                className="w-full p-3 bg-gray-700 rounded-lg resize-none h-32 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              ></textarea>
              <div className="flex justify-between mt-4">
                <button className="flex items-center space-x-2 text-gray-400 hover:text-gray-300">
                  <Share2 className="h-5 w-5" />
                  <span>Share</span>
                </button>
                <button 
                  onClick={handlePostTribute}
                  className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
                  disabled={!tribute.trim() || !tributeName.trim()}
                >
                  <MessageSquare className="h-5 w-5" />
                  <span>Post Tribute</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Overlay */}
      {showChat && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl w-full max-w-lg mx-4 flex flex-col h-[80vh]">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold">Chat with {memorial.name}'s Spirit</h3>
              <button 
                onClick={() => setShowChat(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <div 
                  key={index}
                  className={`rounded-lg p-3 max-w-[80%] ${
                    msg.sender === memorial?.name 
                      ? 'bg-purple-600/20 mr-auto'
                      : 'bg-gray-700 ml-auto' 
                  }`}
                >
                  <p className="text-sm text-gray-300">{msg.text}</p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-700">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 p-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  onClick={handleSendMessage}
                  className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MemorialProfile;