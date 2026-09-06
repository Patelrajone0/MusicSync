import { io } from 'socket.io-client';

async function runTests() {
  console.log('--- TEST 1: REST API Health & Endpoints ---');
  const healthRes = await fetch('http://localhost:3001/api/health');
  const healthData = await healthRes.json();
  console.log('Health:', healthData);

  const curatedRes = await fetch('http://localhost:3001/api/tracks/curated');
  const curatedData = await curatedRes.json();
  console.log(`Curated Tracks Loaded: ${curatedData.tracks.length}`);

  const searchRes = await fetch('http://localhost:3001/api/search?q=neon');
  const searchData = await searchRes.json();
  console.log(`Search Results for "neon": ${searchData.tracks.length} tracks found`);

  console.log('\n--- TEST 2: Multi-Device Real-Time Socket.IO Synchronization ---');
  const host = io('http://localhost:3001');
  const speaker = io('http://localhost:3001');

  await new Promise((resolve) => {
    let connected = 0;
    host.on('connect', () => { if (++connected === 2) resolve(); });
    speaker.on('connect', () => { if (++connected === 2) resolve(); });
  });
  console.log('Both Host and Speaker connected to real-time server.');

  // Test NTP Ping-Pong
  const t0 = performance.now();
  host.emit('ntp_ping', { t0 });
  const ntpResult = await new Promise((resolve) => {
    host.once('ntp_pong', (data) => {
      const t1 = performance.now();
      const rtt = t1 - data.t0;
      const serverOffset = data.serverTime + (rtt / 2) - Date.now();
      resolve({ rtt, serverOffset });
    });
  });
  console.log(`NTP Burst Sync Result: RTT = ${ntpResult.rtt.toFixed(2)}ms, Clock Offset = ${ntpResult.serverOffset.toFixed(2)}ms`);

  // Host creates room
  const roomData = await new Promise((resolve) => {
    host.emit('create_room', { userName: 'Host-Cyber-99' }, (res) => resolve(res));
  });
  const roomCode = roomData.room.code;
  console.log(`Room created successfully! Code: ${roomCode}, Host: ${roomData.user.name}`);

  // Speaker joins room
  const joinData = await new Promise((resolve) => {
    speaker.emit('join_room', { roomCode, userName: 'Speaker-Neon-42' }, (res) => resolve(res));
  });
  console.log(`Speaker joined room ${roomCode}! Role: ${joinData.user.role}, Name: ${joinData.user.name}`);

  // Test Scheduled Synchronized Playback
  console.log('\n--- TEST 3: Scheduled Synchronized Playback Broadcast ---');
  const playPromise = new Promise((resolve) => {
    speaker.once('playback_scheduled', (data) => {
      const delayMs = data.scheduledServerTime - Date.now();
      console.log(`[Speaker] Received scheduled playback! Track: "${data.track.title}"`);
      console.log(`[Speaker] Playback scheduled at server timestamp: ${data.scheduledServerTime} (in ${delayMs}ms)`);
      resolve(data);
    });
  });

  host.emit('request_play', { track: curatedData.tracks[0], position: 0 });
  await playPromise;

  // Test Democratic Queue Voting
  console.log('\n--- TEST 4: Democratic Queue & Upvoting ---');
  const queueUpdatedPromise = new Promise((resolve) => {
    speaker.once('queue_updated', (data) => {
      console.log(`[Speaker] Queue updated with ${data.queue.length} items. Top track: "${data.queue[0]?.title}" with score: ${(data.queue[0]?.upvotes?.length || 0) - (data.queue[0]?.downvotes?.length || 0)}`);
      resolve(data);
    });
  });

  speaker.emit('queue_add', { track: curatedData.tracks[1] });
  await queueUpdatedPromise;

  // Test Real-Time Reactions
  console.log('\n--- TEST 5: Real-Time Floating Reactions ---');
  const reactionPromise = new Promise((resolve) => {
    host.once('new_reaction', (payload) => {
      console.log(`[Host] Received real-time reaction from ${payload.userName}: ${payload.emoji}`);
      resolve(payload);
    });
  });

  speaker.emit('send_reaction', { emoji: '🔥' });
  await reactionPromise;

  // Test Live Room Chat
  console.log('\n--- TEST 6: Live Room Chat ---');
  const chatPromise = new Promise((resolve) => {
    speaker.once('new_chat_message', (msg) => {
      if (!msg.isSystem) {
        console.log(`[Speaker] Chat from ${msg.user.name}: "${msg.text}"`);
        resolve(msg);
      }
    });
  });

  host.emit('send_chat', { text: 'Drop the bass across all speakers! 🔊' });
  await chatPromise;

  console.log('\n ALL MULTI-DEVICE SYNCHRONIZATION TESTS PASSED SUCCESSFULLY!');
  host.disconnect();
  speaker.disconnect();
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
