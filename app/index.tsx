import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
  Text,
  Button,
  Image,
} from "react-native";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function HomeScreen() {
  const [birdHeight, setBirdHeight] = useState<number>(300);
  const [velocity, setVelocity] = useState<number>(0);
  const [bars, setBars] = useState<
    Array<{ x: number; gapY: number; passed: boolean }>
  >([]);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(1);
  const [lastPassTime, setLastPassTime] = useState<number>(0);
  const [barSpeed, setBarSpeed] = useState<number>(3.5);

  const gravity = -2;
  const screenWidth = Dimensions.get("window").width;
  const screenHeight = Dimensions.get("window").height;
  const groundHeight = screenHeight / 4;
  const playableHeight = screenHeight - groundHeight;
  const barWidth = 60;
  const barGap = 250;
  const birdSize = 35;

  const POINTS_PER_BAR = 10;
  const COMBO_TIMEOUT = 1500;
  const MAX_COMBO = 5;

  const HIGH_SCORE_KEY = "highScore";

  const checkCollision = (
    rect1: { x: number; y: number; width: number; height: number },
    rect2: { x: number; y: number; width: number; height: number }
  ): boolean => {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  };

  const resetGame = async () => {
    if (score > highScore) {
      setHighScore(score);
      await AsyncStorage.setItem(HIGH_SCORE_KEY, score.toString());
    }
    setGameStarted(false);
    setGameOver(false);
    setBirdHeight(300);
    setBars([]);
    setScore(0);
    setCombo(1);
    setLastPassTime(0);
  };

  const startGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setBars([
      {
        x: screenWidth,
        gapY: Math.random() * (playableHeight - barGap),
        passed: false,
      },
    ]);
    setBirdHeight(300);
    setVelocity(15);
    setScore(0);
    setCombo(1);
  };

  const loadHighScore = async () => {
    try {
      const storedHighScore = await AsyncStorage.getItem(HIGH_SCORE_KEY);
      if (storedHighScore) {
        setHighScore(parseInt(storedHighScore, 10));
      }
    } catch (error) {
      console.error("Failed to load high score:", error);
    }
  };

  useEffect(() => {
    loadHighScore();
  }, []);

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const interval = setInterval(() => {
      setBirdHeight((prevHeight) => Math.max(prevHeight + velocity, 0));
      setVelocity((prevVelocity) => prevVelocity + gravity);
    }, 20);

    return () => clearInterval(interval);
  }, [velocity, gameStarted, gameOver]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const interval = setInterval(() => {
      setBars((prevBars) => {
        const updatedBars = prevBars.map((bar) => {
          if (!bar.passed && bar.x + barWidth < 200) {
            const currentTime = Date.now();
            if (currentTime - lastPassTime < COMBO_TIMEOUT) {
              setCombo((prev) => Math.min(prev + 1, MAX_COMBO));
            } else {
              setCombo(1);
            }
            setLastPassTime(currentTime);
            setScore((prev) => prev + POINTS_PER_BAR * combo);
            return { ...bar, x: bar.x - barSpeed, passed: true };
          }
          return { ...bar, x: bar.x - barSpeed };
        });

        if (updatedBars[updatedBars.length - 1]?.x < screenWidth - 300) {
          updatedBars.push({
            x: screenWidth,
            gapY: Math.random() * (playableHeight - barGap),
            passed: false,
          });
        }

        return updatedBars.filter((bar) => bar.x + barWidth > 0);
      });
    }, 20);

    return () => clearInterval(interval);
  }, [gameStarted, gameOver, combo, lastPassTime]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const birdBox = {
      x: 200,
      y: playableHeight - birdHeight - birdSize,
      width: birdSize,
      height: birdSize,
    };

    if (birdHeight <= 0 || birdHeight + birdSize >= playableHeight) {
      setGameOver(true);
      setGameStarted(false);
      return;
    }

    for (const bar of bars) {
      const topBar = {
        x: bar.x,
        y: 0,
        width: barWidth,
        height: bar.gapY,
      };

      const bottomBar = {
        x: bar.x,
        y: bar.gapY + barGap,
        width: barWidth,
        height: playableHeight - (bar.gapY + barGap),
      };

      if (
        checkCollision(birdBox, topBar) ||
        checkCollision(birdBox, bottomBar)
      ) {
        setGameOver(true);
        setGameStarted(false);
        return;
      }
    }
  }, [birdHeight, bars, gameStarted, gameOver]);

  useEffect(() => {
    if (score === 0) {
      setBarSpeed(3.5);
      return;
    }
    if (score % 50 === 0) {
      setBarSpeed((prevBarSpeed) => prevBarSpeed + 0.5);
    }
  }, [score]);

  const jump = () => {
    if (gameOver) return;
    if (!gameStarted) startGame();
    setVelocity(15);
  };

  return (
    <TouchableWithoutFeedback onPress={jump}>
      <View style={{ height: "100%", position: "relative" }}>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>Score: {score}</Text>
          <Text style={styles.highScoreText}>High Score: {highScore}</Text>
          {combo > 1 && <Text style={styles.comboText}>Combo: x{combo}</Text>}
        </View>

        <View
          style={{ backgroundColor: "skyblue", flex: 3, alignItems: "center" }}
        >
          {!gameOver && !gameStarted && (
            <Text
              style={{
                position: "relative",
                textAlign: "center",
                top: 200,
                color: "white",
                letterSpacing: 2,
                fontSize: 20,
                fontWeight: "bold",
              }}
            >
              TAP TO PLAY
            </Text>
          )}
          <Image
            source={require("@/assets/images/bird.png")}
            // resizeMode="contain"
            style={{
              width: birdSize + 12,
              height: birdSize,
              position: "absolute",
              bottom: birdHeight,
              // borderColor: "red",
              // borderWidth: 1,
            }}
          />
          {bars.map((bar, index) => (
            <React.Fragment key={index}>
              <View
                style={{
                  position: "absolute",
                  width: barWidth,
                  height: bar.gapY,
                  backgroundColor: "green",
                  left: bar.x,
                  top: 0,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  width: barWidth,
                  height: playableHeight - bar.gapY - barGap,
                  backgroundColor: "green",
                  left: bar.x,
                  bottom: 0,
                }}
              />
            </React.Fragment>
          ))}
          {gameOver && (
            <View style={styles.gameOverContainer}>
              <Text style={styles.gameOverText}>Game Over</Text>
              <Text style={styles.finalScoreText}>Final Score: {score}</Text>
              {score > highScore && (
                <Text style={styles.newHighScoreText}>New High Score!</Text>
              )}
              <Button title="Restart" onPress={resetGame} />
            </View>
          )}
        </View>

        <View style={{ backgroundColor: "saddlebrown", flex: 1 }} />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  scoreContainer: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 1,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 2,
  },
  highScoreText: {
    fontSize: 18,
    color: "white",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 2,
  },
  comboText: {
    fontSize: 20,
    color: "#FFD700",
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 2,
  },
  gameOverContainer: {
    position: "absolute",
    width: "80%",
    top: "50%",
    left: "10%",
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    alignItems: "center",
    borderRadius: 10,
  },
  gameOverText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
  },
  finalScoreText: {
    fontSize: 24,
    color: "white",
    marginVertical: 10,
  },
  newHighScoreText: {
    fontSize: 20,
    color: "#FFD700",
    fontWeight: "bold",
    marginBottom: 20,
  },
});
