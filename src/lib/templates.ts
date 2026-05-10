import type { CircuitTemplate } from '@/types';

export const circuitTemplates: CircuitTemplate[] = [
  {
    id: 'blink',
    name: 'LED Blink',
    description: 'The classic "Hello World" of electronics — blink an LED on pin 13.',
    category: 'beginner',
    difficulty: 1,
    components: [
      {
        id: 'led1',
        type: 'led',
        name: 'Red LED',
        x: 300,
        y: 200,
        rotation: 0,
        pins: [
          { pinNumber: 1, pinName: 'anode', value: 'low' },
          { pinNumber: 2, pinName: 'cathode', value: 'low' },
        ],
        props: { color: 'red' },
      },
      {
        id: 'res1',
        type: 'resistor',
        name: '220Ω Resistor',
        x: 250,
        y: 200,
        rotation: 0,
        pins: [
          { pinNumber: 1, pinName: 'pin1', value: 'low' },
          { pinNumber: 2, pinName: 'pin2', value: 'low' },
        ],
        props: { resistance: 220 },
      },
    ],
    code: `void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}`,
    circuitCode: `<board>
  <resistor name="R1" resistance="220" pcbX={-5} pcbY={0} />
  <led name="LED1" color="red" pcbX={0} pcbY={0} />
  <trace from=".R1 > .pin2" to=".LED1 > .anode" />
</board>`,
    tags: ['led', 'blink', 'beginner', 'arduino'],
  },
  {
    id: 'traffic-light',
    name: 'Traffic Light',
    description: 'Simulate a traffic light with red, yellow, and green LEDs.',
    category: 'beginner',
    difficulty: 2,
    components: [
      {
        id: 'led-red',
        type: 'led',
        name: 'Red LED',
        x: 300,
        y: 120,
        rotation: 0,
        pins: [
          { pinNumber: 1, pinName: 'anode', value: 'low' },
          { pinNumber: 2, pinName: 'cathode', value: 'low' },
        ],
        props: { color: 'red' },
      },
      {
        id: 'led-yellow',
        type: 'led',
        name: 'Yellow LED',
        x: 300,
        y: 200,
        rotation: 0,
        pins: [
          { pinNumber: 1, pinName: 'anode', value: 'low' },
          { pinNumber: 2, pinName: 'cathode', value: 'low' },
        ],
        props: { color: 'yellow' },
      },
      {
        id: 'led-green',
        type: 'led',
        name: 'Green LED',
        x: 300,
        y: 280,
        rotation: 0,
        pins: [
          { pinNumber: 1, pinName: 'anode', value: 'low' },
          { pinNumber: 2, pinName: 'cathode', value: 'low' },
        ],
        props: { color: 'green' },
      },
    ],
    code: `void setup() {
  pinMode(12, OUTPUT); // Red
  pinMode(11, OUTPUT); // Yellow
  pinMode(10, OUTPUT); // Green
}

void loop() {
  // Red
  digitalWrite(12, HIGH);
  digitalWrite(11, LOW);
  digitalWrite(10, LOW);
  delay(5000);

  // Yellow
  digitalWrite(12, LOW);
  digitalWrite(11, HIGH);
  digitalWrite(10, LOW);
  delay(2000);

  // Green
  digitalWrite(12, LOW);
  digitalWrite(11, LOW);
  digitalWrite(10, HIGH);
  delay(5000);

  // Yellow (transition)
  digitalWrite(12, LOW);
  digitalWrite(11, HIGH);
  digitalWrite(10, LOW);
  delay(2000);
}`,
    circuitCode: `<board>
  <led name="RED" color="red" pcbX={-3} pcbY={-2} />
  <led name="YLW" color="yellow" pcbX={-3} pcbY={0} />
  <led name="GRN" color="green" pcbX={-3} pcbY={2} />
</board>`,
    tags: ['led', 'traffic', 'beginner', 'multi-led'],
  },
  {
    id: 'button-led',
    name: 'Button + LED',
    description: 'Press a button to toggle an LED on and off.',
    category: 'beginner',
    difficulty: 2,
    components: [
      {
        id: 'btn1',
        type: 'button',
        name: 'Push Button',
        x: 200,
        y: 150,
        rotation: 0,
        pins: [
          { pinNumber: 1, pinName: 'pin1', value: 'low' },
          { pinNumber: 2, pinName: 'pin2', value: 'low' },
          { pinNumber: 3, pinName: 'pin3', value: 'low' },
          { pinNumber: 4, pinName: 'pin4', value: 'low' },
        ],
      },
      {
        id: 'led1',
        type: 'led',
        name: 'Blue LED',
        x: 350,
        y: 150,
        rotation: 0,
        pins: [
          { pinNumber: 1, pinName: 'anode', value: 'low' },
          { pinNumber: 2, pinName: 'cathode', value: 'low' },
        ],
        props: { color: '#3b82f6' },
      },
      {
        id: 'res1',
        type: 'resistor',
        name: '10kΩ Pull-down',
        x: 250,
        y: 200,
        rotation: 90,
        pins: [
          { pinNumber: 1, pinName: 'pin1', value: 'low' },
          { pinNumber: 2, pinName: 'pin2', value: 'low' },
        ],
        props: { resistance: 10000 },
      },
    ],
    code: `const int buttonPin = 2;
const int ledPin = 13;
int ledState = LOW;
int lastButtonState = LOW;

void setup() {
  pinMode(buttonPin, INPUT);
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int reading = digitalRead(buttonPin);

  if (reading != lastButtonState) {
    delay(50); // debounce
    if (reading != lastButtonState) {
      ledState = !ledState;
      digitalWrite(ledPin, ledState);
      Serial.println(ledState ? "LED ON" : "LED OFF");
    }
  }
  lastButtonState = reading;
}`,
    circuitCode: `<board>
  <button name="SW1" pcbX={-2} pcbY={0} />
  <resistor name="R1" resistance="10k" pcbX={0} pcbY={2} />
  <led name="LED1" color="blue" pcbX={2} pcbY={0} />
</board>`,
    tags: ['button', 'led', 'input', 'beginner'],
  },
  {
    id: 'potentiometer-led',
    name: 'PWM LED Dimmer',
    description: 'Use a potentiometer to control LED brightness with PWM.',
    category: 'intermediate',
    difficulty: 3,
    components: [
      {
        id: 'pot1',
        type: 'potentiometer',
        name: '10kΩ Potentiometer',
        x: 200,
        y: 200,
        rotation: 0,
        pins: [
          { pinNumber: 1, pinName: 'pin1', value: 'low' },
          { pinNumber: 2, pinName: 'wiper', value: 'low' },
          { pinNumber: 3, pinName: 'pin3', value: 'low' },
        ],
        props: { resistance: 10000 },
      },
      {
        id: 'led1',
        type: 'led',
        name: 'White LED',
        x: 350,
        y: 200,
        rotation: 0,
        pins: [
          { pinNumber: 1, pinName: 'anode', value: 'low' },
          { pinNumber: 2, pinName: 'cathode', value: 'low' },
        ],
        props: { color: 'white' },
      },
    ],
    code: `const int potPin = A0;
const int ledPin = 9; // PWM pin

void setup() {
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int potValue = analogRead(potPin);
  int brightness = map(potValue, 0, 1023, 0, 255);
  analogWrite(ledPin, brightness);
  Serial.print("Pot: ");
  Serial.print(potValue);
  Serial.print(" -> Brightness: ");
  Serial.println(brightness);
  delay(100);
}`,
    circuitCode: `<board>
  <potentiometer name="POT1" resistance="10k" pcbX={-2} pcbY={0} />
  <led name="LED1" color="white" pcbX={2} pcbY={0} />
  <resistor name="R1" resistance="220" pcbX={0} pcbY={1} />
</board>`,
    tags: ['pwm', 'potentiometer', 'analog', 'intermediate'],
  },
  {
    id: 'lcd-hello',
    name: 'LCD Hello World',
    description: 'Display text on a 16x2 LCD screen.',
    category: 'intermediate',
    difficulty: 3,
    components: [
      {
        id: 'lcd1',
        type: 'lcd',
        name: '16x2 LCD',
        x: 300,
        y: 200,
        rotation: 0,
        pins: Array.from({ length: 16 }, (_, i) => ({
          pinNumber: i + 1,
          pinName: `pin${i + 1}`,
          value: 'low' as const,
        })),
        props: { rows: 2, cols: 16 },
      },
      {
        id: 'pot1',
        type: 'potentiometer',
        name: 'Contrast Pot',
        x: 150,
        y: 300,
        rotation: 0,
        pins: [
          { pinNumber: 1, pinName: 'pin1', value: 'low' },
          { pinNumber: 2, pinName: 'wiper', value: 'low' },
          { pinNumber: 3, pinName: 'pin3', value: 'low' },
        ],
        props: { resistance: 10000 },
      },
    ],
    code: `#include <LiquidCrystal.h>

// Initialize with pins: RS, E, D4, D5, D6, D7
LiquidCrystal lcd(12, 11, 5, 4, 3, 2);

void setup() {
  lcd.begin(16, 2);
  lcd.print("Hello, Eesha!");
  lcd.setCursor(0, 1);
  lcd.print("Learn Circuits");
}

void loop() {
  // Scroll text
  for (int i = 0; i < 16; i++) {
    lcd.scrollDisplayLeft();
    delay(300);
  }
  for (int i = 0; i < 32; i++) {
    lcd.scrollDisplayRight();
    delay(300);
  }
}`,
    circuitCode: `<board>
  <chip name="LCD1" footprint="lcd_16x2" pcbX={0} pcbY={0} />
  <potentiometer name="POT1" resistance="10k" pcbX={-3} pcbY={2} />
</board>`,
    tags: ['lcd', 'display', 'intermediate', 'i2c'],
  },
  {
    id: 'servo-control',
    name: 'Servo Motor Control',
    description: 'Control a servo motor position with a potentiometer.',
    category: 'intermediate',
    difficulty: 3,
    components: [
      {
        id: 'servo1',
        type: 'servo',
        name: 'SG90 Servo',
        x: 350,
        y: 200,
        rotation: 0,
        pins: [
          { pinNumber: 1, pinName: 'vcc', value: 'high' },
          { pinNumber: 2, pinName: 'signal', value: 'low' },
          { pinNumber: 3, pinName: 'gnd', value: 'low' },
        ],
        props: { minAngle: 0, maxAngle: 180 },
      },
      {
        id: 'pot1',
        type: 'potentiometer',
        name: '10kΩ Pot',
        x: 200,
        y: 200,
        rotation: 0,
        pins: [
          { pinNumber: 1, pinName: 'pin1', value: 'low' },
          { pinNumber: 2, pinName: 'wiper', value: 'low' },
          { pinNumber: 3, pinName: 'pin3', value: 'low' },
        ],
        props: { resistance: 10000 },
      },
    ],
    code: `#include <Servo.h>

Servo myServo;
const int potPin = A0;

void setup() {
  myServo.attach(9);
  Serial.begin(9600);
  Serial.println("Servo Control Ready");
}

void loop() {
  int potValue = analogRead(potPin);
  int angle = map(potValue, 0, 1023, 0, 180);
  myServo.write(angle);
  Serial.print("Angle: ");
  Serial.println(angle);
  delay(15);
}`,
    circuitCode: `<board>
  <potentiometer name="POT1" resistance="10k" pcbX={-2} pcbY={0} />
  <servo name="SRV1" pcbX={2} pcbY={0} />
</board>`,
    tags: ['servo', 'motor', 'pwm', 'intermediate'],
  },
  {
    id: 'rgb-led',
    name: 'RGB LED Color Mixer',
    description: 'Mix colors using three potentiometers to control an RGB LED.',
    category: 'intermediate',
    difficulty: 3,
    components: [
      {
        id: 'rgb1',
        type: 'rgb_led',
        name: 'RGB LED',
        x: 350,
        y: 200,
        rotation: 0,
        pins: [
          { pinNumber: 1, pinName: 'red', value: 'low' },
          { pinNumber: 2, pinName: 'green', value: 'low' },
          { pinNumber: 3, pinName: 'blue', value: 'low' },
          { pinNumber: 4, pinName: 'common', value: 'low' },
        ],
      },
      {
        id: 'pot-r',
        type: 'potentiometer',
        name: 'Red Pot',
        x: 150,
        y: 100,
        rotation: 0,
        pins: [
          { pinNumber: 1, pinName: 'pin1', value: 'low' },
          { pinNumber: 2, pinName: 'wiper', value: 'low' },
          { pinNumber: 3, pinName: 'pin3', value: 'low' },
        ],
        props: { resistance: 10000 },
      },
      {
        id: 'pot-g',
        type: 'potentiometer',
        name: 'Green Pot',
        x: 150,
        y: 200,
        rotation: 0,
        pins: [
          { pinNumber: 1, pinName: 'pin1', value: 'low' },
          { pinNumber: 2, pinName: 'wiper', value: 'low' },
          { pinNumber: 3, pinName: 'pin3', value: 'low' },
        ],
        props: { resistance: 10000 },
      },
      {
        id: 'pot-b',
        type: 'potentiometer',
        name: 'Blue Pot',
        x: 150,
        y: 300,
        rotation: 0,
        pins: [
          { pinNumber: 1, pinName: 'pin1', value: 'low' },
          { pinNumber: 2, pinName: 'wiper', value: 'low' },
          { pinNumber: 3, pinName: 'pin3', value: 'low' },
        ],
        props: { resistance: 10000 },
      },
    ],
    code: `const int redPot = A0;
const int greenPot = A1;
const int bluePot = A2;
const int redPin = 9;
const int greenPin = 10;
const int bluePin = 11;

void setup() {
  pinMode(redPin, OUTPUT);
  pinMode(greenPin, OUTPUT);
  pinMode(bluePin, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int r = map(analogRead(redPot), 0, 1023, 0, 255);
  int g = map(analogRead(greenPot), 0, 1023, 0, 255);
  int b = map(analogRead(bluePot), 0, 1023, 0, 255);
  
  analogWrite(redPin, r);
  analogWrite(greenPin, g);
  analogWrite(bluePin, b);
  
  Serial.print("R:");
  Serial.print(r);
  Serial.print(" G:");
  Serial.print(g);
  Serial.print(" B:");
  Serial.println(b);
  
  delay(50);
}`,
    circuitCode: `<board>
  <rgb-led name="RGB1" pcbX={2} pcbY={0} />
  <potentiometer name="PR" resistance="10k" pcbX={-3} pcbY={-2} />
  <potentiometer name="PG" resistance="10k" pcbX={-3} pcbY={0} />
  <potentiometer name="PB" resistance="10k" pcbX={-3} pcbY={2} />
</board>`,
    tags: ['rgb', 'led', 'color', 'pwm', 'intermediate'],
  },
  {
    id: 'buzzer-melody',
    name: 'Piezo Buzzer Melody',
    description: 'Play a simple melody on a piezo buzzer.',
    category: 'beginner',
    difficulty: 2,
    components: [
      {
        id: 'buzzer1',
        type: 'buzzer',
        name: 'Piezo Buzzer',
        x: 300,
        y: 200,
        rotation: 0,
        pins: [
          { pinNumber: 1, pinName: 'positive', value: 'low' },
          { pinNumber: 2, pinName: 'negative', value: 'low' },
        ],
      },
    ],
    code: `const int buzzerPin = 8;

// Notes (Hz)
#define NOTE_C4  262
#define NOTE_D4  294
#define NOTE_E4  330
#define NOTE_F4  349
#define NOTE_G4  392
#define NOTE_A4  440
#define NOTE_B4  494
#define NOTE_C5  523

int melody[] = {NOTE_C4, NOTE_D4, NOTE_E4, NOTE_F4, NOTE_G4, NOTE_A4, NOTE_B4, NOTE_C5};
int durations[] = {4, 4, 4, 4, 4, 4, 4, 2};

void setup() {
  Serial.begin(9600);
  Serial.println("Playing melody...");
}

void loop() {
  for (int i = 0; i < 8; i++) {
    int noteDuration = 1000 / durations[i];
    tone(buzzerPin, melody[i], noteDuration);
    delay(noteDuration * 1.3);
    Serial.println(melody[i]);
  }
  delay(2000);
}`,
    circuitCode: `<board>
  <buzzer name="BZ1" pcbX={0} pcbY={0} />
</board>`,
    tags: ['buzzer', 'sound', 'melody', 'beginner'],
  },
  {
    id: 'photoresistor',
    name: 'Light Sensor',
    description: 'Read ambient light levels with a photoresistor and display on serial.',
    category: 'beginner',
    difficulty: 2,
    components: [
      {
        id: 'photo1',
        type: 'photoresistor',
        name: 'Photoresistor (LDR)',
        x: 250,
        y: 200,
        rotation: 0,
        pins: [
          { pinNumber: 1, pinName: 'pin1', value: 'low' },
          { pinNumber: 2, pinName: 'pin2', value: 'low' },
        ],
      },
      {
        id: 'res1',
        type: 'resistor',
        name: '10kΩ Resistor',
        x: 250,
        y: 280,
        rotation: 90,
        pins: [
          { pinNumber: 1, pinName: 'pin1', value: 'low' },
          { pinNumber: 2, pinName: 'pin2', value: 'low' },
        ],
        props: { resistance: 10000 },
      },
      {
        id: 'led1',
        type: 'led',
        name: 'Green LED',
        x: 350,
        y: 200,
        rotation: 0,
        pins: [
          { pinNumber: 1, pinName: 'anode', value: 'low' },
          { pinNumber: 2, pinName: 'cathode', value: 'low' },
        ],
        props: { color: '#22c55e' },
      },
    ],
    code: `const int lightPin = A0;
const int ledPin = 9;
const int threshold = 500;

void setup() {
  pinMode(ledPin, OUTPUT);
  Serial.begin(9600);
  Serial.println("Light Sensor Ready");
}

void loop() {
  int lightLevel = analogRead(lightPin);
  
  if (lightLevel < threshold) {
    analogWrite(ledPin, map(lightLevel, 0, threshold, 255, 0));
  } else {
    analogWrite(ledPin, 0);
  }
  
  Serial.print("Light: ");
  Serial.print(lightLevel);
  Serial.print(" | Status: ");
  Serial.println(lightLevel < threshold ? "DARK" : "BRIGHT");
  
  delay(200);
}`,
    circuitCode: `<board>
  <photoresistor name="LDR1" pcbX={-1} pcbY={0} />
  <resistor name="R1" resistance="10k" pcbX={-1} pcbY={2} />
  <led name="LED1" color="green" pcbX={2} pcbY={0} />
</board>`,
    tags: ['sensor', 'light', 'photoresistor', 'analog', 'beginner'],
  },
  {
    id: 'seven-segment',
    name: '7-Segment Counter',
    description: 'Count from 0 to 9 on a seven-segment display.',
    category: 'intermediate',
    difficulty: 3,
    components: [
      {
        id: 'seg1',
        type: 'seven_segment',
        name: '7-Segment Display',
        x: 300,
        y: 200,
        rotation: 0,
        pins: Array.from({ length: 10 }, (_, i) => ({
          pinNumber: i + 1,
          pinName: `pin${i + 1}`,
          value: 'low' as const,
        })),
        props: { commonCathode: true },
      },
    ],
    code: `// Segment pins: a, b, c, d, e, f, g, dp
const int segments[] = {2, 3, 4, 5, 6, 7, 8};

// Digit patterns (0-9) - common cathode
const byte digits[10][7] = {
  {1,1,1,1,1,1,0}, // 0
  {0,1,1,0,0,0,0}, // 1
  {1,1,0,1,1,0,1}, // 2
  {1,1,1,1,0,0,1}, // 3
  {0,1,1,0,0,1,1}, // 4
  {1,0,1,1,0,1,1}, // 5
  {1,0,1,1,1,1,1}, // 6
  {1,1,1,0,0,0,0}, // 7
  {1,1,1,1,1,1,1}, // 8
  {1,1,1,1,0,1,1}, // 9
};

void displayDigit(int num) {
  for (int i = 0; i < 7; i++) {
    digitalWrite(segments[i], digits[num][i]);
  }
}

void setup() {
  for (int i = 0; i < 7; i++) {
    pinMode(segments[i], OUTPUT);
  }
  Serial.begin(9600);
}

void loop() {
  for (int i = 0; i <= 9; i++) {
    displayDigit(i);
    Serial.print("Displaying: ");
    Serial.println(i);
    delay(1000);
  }
}`,
    circuitCode: `<board>
  <seven-segment name="DISP1" commonCathode={true} pcbX={0} pcbY={0} />
</board>`,
    tags: ['display', 'counter', 'seven-segment', 'intermediate'],
  },
];
