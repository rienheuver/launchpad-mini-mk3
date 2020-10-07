const easymidi = require('easymidi');
const cp = require('child_process');
var player = require('play-sound')({player: 'mplayer'});

const inputs = easymidi.getInputs();
const launchpadName = inputs.filter((name) =>
  name.includes('Launchpad Mini MK3 MIDI 2')
)[0];

const padInput = new easymidi.Input(launchpadName);
const padOutput = new easymidi.Output(launchpadName);

const powerOffTime = 1000; // in milliseconds
const powerOffColour = 5;
const novationLogoColour = 37;
const buttonOnColour = 21;
const buttonLights = [
  [21, 45, 49, 0, 0, 0, 1, 57],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [41, 42, 43, 45, 46, 0, 0, 0],
  [5, 6, 21, 45, 13, 60, 0, 31],
];
const buttonFunctions = {
  81: 'cmd:google-chrome',
  82: 'cmd:code',
  83: 'cmd:slack',
  87: 'cmd:gnome-terminal',
  88: 'cmd:gedit',
  21: 'sound:get-to-the-choppa.mp3',
  22: 'sound:do-it.mp3',
  23: 'sound:huh.mp3',
  24: 'sound:ugly-motherfuker.mp3',
  25: 'sound:wth-are-you.mp3',
  11: 'sound:wrong.mp3',
  12: 'sound:error.mp3',
  13: 'sound:headshot.mp3',
  14: 'sound:its-me-mario.mp3',
  15: 'sound:kamehameha.mp3',
  16: 'sound:leroy.mp3',
  18: 'sound:work-work.mp3'
};

process.on('SIGINT', function () {
  quit();
});

let powerOffTimer;
padInput.on('message', (msg) => {
  console.log(msg);

  // Power-off button
  if (msg.channel === 0 && msg.controller === 19) {
    if (msg.value === 127) {
      powerOffTimer = setTimeout(() => {
        quit();
      }, powerOffTime);
    } else {
      clearTimeout(powerOffTimer);
    }
  }

  // Visual feedback for pressing a note
  if (msg.note) {
    const row = 8 - Math.floor(msg.note / 10);
    const col = (msg.note % 10) - 1;
    if (msg.velocity === 127) {
      lightUp(msg.note, buttonOnColour, 0);
    } else {
      lightUp(msg.note, buttonLights[row][col], 0);
    }

    if (msg.velocity === 127) {
      if (buttonFunctions[msg.note]) {
        const parts = buttonFunctions[msg.note].split(':');
        const type = parts[0];
        const value = parts[1];
        switch (type) {
          case 'cmd':
            console.log(value);
            runCommand(value);
            break;

          case 'sound':
            playSound(value);
            break;
        }
      }
    }
  }
});

(async () => {
  sysex(14, 1); // Set in programmer mode
  scrollText('Hi');
  lightUp(19, powerOffColour, 0); // Light up power-off button
  lightUp(99, novationLogoColour, 0); // Light up novation logo

  for (let i = 0; i < buttonLights.length; i++) {
    for (let j = 0; j < buttonLights[i].length; j++) {
      const btn = (8 - i) * 10 + j + 1;
      lightUp(btn, buttonLights[i][j], 0);
    }
  }
})();

function sysex(...bytes) {
  padOutput.send('sysex', [240, 0, 32, 41, 2, 13, ...bytes, 247]);
}

function scrollText(text) {
  sysex(
    7,
    0,
    8,
    0,
    37,
    ...text.split('').map((a) => {
      return a.charCodeAt(0);
    })
  );
}

function lightUp(button, colour, mode) {
  if (mode == 1) {
    sysex(3, mode, button, colour, colour + 3);
  } else {
    sysex(3, mode, button, colour);
  }
}

async function disco(button) {
  let i = 5;
  while (true) {
    console.log(i % 56);
    lightUp(button, i % 56, 0);
    await sleep(100);
    i += 8;
  }
}

function runCommand(command) {
  const job = cp.exec(command);
  job.stdout.on('data', function (data) {
    console.log(data.toString());
  });
}

function playSound(file) {
  player.play(`./sounds/${file}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function quit() {
  scrollText('Bye');
  sysex(padOutput, 14, 0);
  process.exit(0);
}
