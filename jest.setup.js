require('@testing-library/jest-dom')

// Mock environment variables
process.env.ASSEMBLYAI_API_KEY = 'test-assemblyai-key'
process.env.GOOGLE_GEMINI_API_KEY = 'test-gemini-key'
process.env.ELEVENLABS_API_KEY = 'test-elevenlabs-key'

// Mock Web APIs that aren't available in jsdom
global.MediaRecorder = class MockMediaRecorder {
  static isTypeSupported = jest.fn().mockReturnValue(true)
  
  constructor(stream, options) {
    this.stream = stream
    this.options = options
    this.state = 'inactive'
    this.ondataavailable = null
  }
  
  start(timeslice) {
    this.state = 'recording'
    setTimeout(() => {
      if (this.ondataavailable) {
        const mockBlob = new Blob(['mock audio data'], { type: 'audio/webm' })
        this.ondataavailable({ data: mockBlob })
      }
    }, 100)
  }
  
  stop() {
    this.state = 'inactive'
  }
}

global.WebSocket = class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  
  constructor(url) {
    this.url = url
    this.readyState = MockWebSocket.CONNECTING
    this.onopen = null
    this.onmessage = null
    this.onerror = null
    this.onclose = null
    
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      if (this.onopen) this.onopen(new Event('open'))
    }, 10)
  }
  
  send(data) {
    // Mock send functionality
  }
  
  close() {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) this.onclose(new CloseEvent('close'))
  }
}

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockResolvedValue({
      getTracks: () => [{ stop: jest.fn() }]
    })
  },
  writable: true
})

// Mock FileReader
global.FileReader = class MockFileReader {
  constructor() {
    this.onloadend = null
    this.result = null
  }
  
  readAsDataURL(blob) {
    setTimeout(() => {
      this.result = 'data:audio/webm;base64,bW9jayBhdWRpbyBkYXRh'
      if (this.onloadend) this.onloadend(new ProgressEvent('loadend'))
    }, 10)
  }
}

// Mock BlobEvent
global.BlobEvent = class MockBlobEvent extends Event {
  constructor(type, eventInitDict) {
    super(type)
    this.data = eventInitDict?.data || null
  }
}

// Mock CloseEvent
global.CloseEvent = class MockCloseEvent extends Event {
  constructor(type, eventInitDict) {
    super(type)
    this.code = eventInitDict?.code || 1000
    this.reason = eventInitDict?.reason || ''
    this.wasClean = eventInitDict?.wasClean || true
  }
}