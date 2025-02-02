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
  
  // First useEffect for memorial state
  useEffect(() => {
    const { _id, name, image, birth, death, voice, bio } = location.state;
    setMemorial({ _id, name, image, birth, death, voice, bio });
  }, [location.state]);

  // Second useEffect for speech recognition
  useEffect(() => {
    recognitionRef.current = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    const recognition = recognitionRef.current;
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = async (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart + ' ';
        } else {
          interimTranscript += transcriptPart;
        }
      }
    
      console.log('Interim Transcript:', interimTranscript);
    
      // Reset the pause timer whenever there's new speech input
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Set a timeout to detect a pause in speech (e.g., 2 seconds)
      timeoutId = setTimeout(() => {
        if (finalTranscript.trim()) {
          onSpeechComplete(finalTranscript.trim());
          finalTranscript = ''; // Reset the transcript after processing
        }
      }, 2000); // 2 seconds pause detection
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
    };

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, []);

  // Add a new function for handling text-to-speech
  const playTextToSpeech = async (text: string) => {
    try {
      const response = await client.textToSpeech.convert(
        "6AGekT2sbNEtCcYlA5Kx",
        {
          output_format: "mp3_44100_128",
          text: text,
          model_id: "eleven_multilingual_v2"
        }
      );

      // Use the existing reader from the response
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
      console.log('Blob size:', audioBlob.size);
      
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

  if (!memorial) return <div>Memorial not found</div>;

  let finalTranscript = ''; // To store the final transcript
  let timeoutId: number | null = null;
  
  // Function to be called when the user is considered "done" speaking
  const onSpeechComplete = async(finalText: string) => {
    console.log('User has completed speaking. Final transcript:', finalText);
    const spich = await handleCallAPI(finalText);
    if (spich) {
      playTextToSpeech(spich);
    }
    // Call your desired function here with the final text
    // Example: processFinalText(finalText);
  };

  const handleCallAPI = async(txt: string): Promise<string | null> => {
    if (txt.trim()) {
      try {
        const response = await axios.post('http://localhost:5000/api/sendmsg', {
          did: memorial._id,
          question: txt,
          past_convo: voices.map(msg => `${msg.sender}: ${msg.text}`).join('\n'),
          name: memorial.name
        });
        setVoices(prevMessages => [...prevMessages, 
          { sender: "User", text: txt },
          { sender: memorial.name, text: response.data.data }
        ]);
        return response.data.data;
      } catch (error) {
        console.error('Error fetching memorials:', error);
        return null;
      }
    }
    return null;
  };

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
        const response = await axios.post('http://localhost:5000/api/sendmsg', pathaune);
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

  const handlePostTribute = () => {
    if (tribute.trim()) {
      // Here you would typically send the tribute to a backend
      setTribute('');
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

  const endCall = () => {
    setIsCallActive(false);
    // Stop recognition when call ends
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setTranscript('');
  };

  return (
    <div className="pt-16">
      <div className="relative h-[40vh]">
        <img
          src={memorial.image}
          alt={memorial.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-32 relative">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
              <h1 className="text-4xl font-bold mb-4">{memorial.name}</h1>
              <p className="text-gray-400 mb-6">{memorial.birth} - {memorial.death}</p>
              <p className="text-lg text-gray-300">{memorial.bio}</p>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 shadow-xl">
              <h2 className="text-2xl font-bold mb-6">Tributes</h2>
              <div className="space-y-6">
                {/* {memorial.messages.map((msg) => (
                  <div key={msg.id} className="border-l-4 border-purple-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-300">{msg.author}</span>
                      <span className="text-sm text-gray-500">{msg.date}</span>
                    </div>
                    <p className="text-gray-300">{msg.text}</p>
                    <div className="mt-2">
                      {msg.type === 'candle' && <Candle className="h-4 w-4 text-yellow-400" />}
                      {msg.type === 'love' && <Heart className="h-4 w-4 text-pink-400" />}
                    </div>
                  </div>
                ))} */}
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
                    onClick={endCall}
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
                <button className="flex-1 flex items-center justify-center space-x-2 p-3 bg-yellow-600/20 hover:bg-yellow-600/30 rounded-lg transition-colors">
                  <Candle className="h-5 w-5 text-yellow-400" />
                  <span>Light Candle</span>
                </button>
                <button className="flex-1 flex items-center justify-center space-x-2 p-3 bg-pink-600/20 hover:bg-pink-600/30 rounded-lg transition-colors">
                  <Heart className="h-5 w-5 text-pink-400" />
                  <span>Send Love</span>
                </button>
              </div>
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