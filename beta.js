// Aimbot
var aimbot = new client.Hack(function(this_) {

  this_.target = null;
  this_.targetDistance = Infinity;

  this_.maxDistance = 50;

  this_.gainX = 120;
  this_.gainY = 0.32;

  this_.maxMouseX = 1000000;
  this_.maxMouseY = 256000;

  this_.deadzoneX = 0.008;
  this_.deadzoneY = 4;

  this_.targetSmooth = 0.20;
  this_.angleSmooth = 0.30;

  this_.angleY = 0;
  this_.screenY = null;

  this_.canvas = null;

  // ----------------------------------------------------------
  // Prediction
  // ----------------------------------------------------------

  this_.prediction = {
    leadTime: 0.10,
    velocitySmooth: 0.65,
    maxLead: 6.0,
    minSpeed: 0.03
  };

  this_.velocity = new THREE.Vector3();

  // ----------------------------------------------------------
  // Canvas
  // ----------------------------------------------------------

  this_.getCanvas = function() {

    if(
      this_.canvas &&
      document.contains(this_.canvas)
    ) {
      return this_.canvas;
    }

    this_.canvas =
      document.querySelector("canvas");

    return this_.canvas;
  };

  // ----------------------------------------------------------
  // Horizontal angle
  // ----------------------------------------------------------

  this_.getHorizontalError = function(worldPos) {

    try {

      if(!window.camera) return null;

      var local =
        worldPos.clone();

      camera.worldToLocal(local);

      return Math.atan2(
        local.x,
        -local.z
      );

    } catch(e) {

      return null;

    }
  };

  // ----------------------------------------------------------
  // Vertical screen position
  // ----------------------------------------------------------

  this_.getVerticalScreen = function(worldPos) {

    try {

      if(!window.camera) return null;

      var projected =
        worldPos.clone().project(camera);

      if(
        !Number.isFinite(projected.x) ||
        !Number.isFinite(projected.y) ||
        !Number.isFinite(projected.z)
      ) {
        return null;
      }

      if(
        projected.z < -1 ||
        projected.z > 1
      ) {
        return null;
      }

      return (
        1 - projected.y
      ) *
      innerHeight /
      2;

    } catch(e) {

      return null;

    }
  };

  // ----------------------------------------------------------
  // Upper-body aim point
  // ----------------------------------------------------------

  this_.getBetterAimPoint = function(player) {

    try {

      var box =
        new THREE.Box3().setFromObject(player);

      if(box.isEmpty()) {

        return player.getWorldPosition(
          new THREE.Vector3()
        ).add(
          new THREE.Vector3(
            0,
            1.15,
            0
          )
        );
      }

      var height =
        box.max.y -
        box.min.y;

      if(
        !Number.isFinite(height) ||
        height <= 0.05
      ) {

        return player.getWorldPosition(
          new THREE.Vector3()
        ).add(
          new THREE.Vector3(
            0,
            1.15,
            0
          )
        );
      }

      return new THREE.Vector3(

        (box.min.x + box.max.x) / 2,

        box.min.y +
        height * 0.72,

        (box.min.z + box.max.z) / 2

      );

    } catch(e) {

      return player.getWorldPosition(
        new THREE.Vector3()
      ).add(
        new THREE.Vector3(
          0,
          1.15,
          0
        )
      );

    }
  };

  // ----------------------------------------------------------
  // Direct yaw + pitch -> mouse delta
  // ----------------------------------------------------------

  this_.getBetterAimDelta = function(worldPos) {

    try {

      if(!window.camera) return null;

      var local =
        worldPos.clone();

      camera.worldToLocal(local);

      var x = local.x;
      var y = local.y;
      var z = local.z;

      var distance =
        Math.sqrt(
          x * x +
          y * y +
          z * z
        );

      if(distance < 0.001) {

        return {
          x: 0,
          y: 0
        };
      }

      var yaw =
        Math.atan2(
          x,
          -z
        );

      var horizontal =
        Math.sqrt(
          x * x +
          z * z
        );

      var pitch =
        Math.atan2(
          y,
          Math.max(
            0.0001,
            horizontal
          )
        );

      var width =
        innerWidth;

      var height =
        innerHeight;

      if(
        width <= 0 ||
        height <= 0
      ) {
        return null;
      }

      var verticalFov =
        THREE.MathUtils.degToRad(
          Number(camera.fov) || 60
        );

      var aspect =
        camera.aspect ||
        width / height;

      var horizontalFov =
        2 *
        Math.atan(
          Math.tan(
            verticalFov / 2
          ) *
          aspect
        );

      var movementX =
        Math.tan(yaw) *
        (
          width /
          (
            2 *
            Math.tan(
              horizontalFov / 2
            )
          )
        );

      var movementY =
        -Math.tan(pitch) *
        (
          height /
          (
            2 *
            Math.tan(
              verticalFov / 2
            )
          )
        );

      if(
        !Number.isFinite(movementX) ||
        !Number.isFinite(movementY)
      ) {
        return null;
      }

      movementX =
        Math.max(
          -1000000,
          Math.min(
            1000000,
            movementX
          )
        );

      movementY =
        Math.max(
          -256000,
          Math.min(
            256000,
            movementY
          )
        );

      return {
        x: movementX,
        y: movementY
      };

    } catch(e) {

      return null;

    }
  };

  // ----------------------------------------------------------
  // Prediction
  // ----------------------------------------------------------

  this_.getPredictedAimPoint = function(player) {

    try {

      var point =
        this_.getBetterAimPoint(
          player
        );

      if(!point) {
        return null;
      }

      var velocity =
        player.velocity;

      if(
        !velocity ||
        !Number.isFinite(velocity.x) ||
        !Number.isFinite(velocity.y) ||
        !Number.isFinite(velocity.z)
      ) {

        return point;
      }

      /*
       * Smooth the game's real velocity.
       */
      this_.velocity.x +=
        (
          velocity.x -
          this_.velocity.x
        ) *
        this_.prediction.velocitySmooth;

      this_.velocity.y +=
        (
          velocity.y -
          this_.velocity.y
        ) *
        this_.prediction.velocitySmooth;

      this_.velocity.z +=
        (
          velocity.z -
          this_.velocity.z
        ) *
        this_.prediction.velocitySmooth;

      /*
       * Use horizontal speed for prediction decisions.
       * Vertical velocity does not control target selection.
       */
      var horizontalSpeed =
        Math.hypot(
          this_.velocity.x,
          this_.velocity.z
        );

      if(
        horizontalSpeed <
        this_.prediction.minSpeed
      ) {

        return point;
      }

      /*
       * Adaptive lead based on horizontal movement.
       *
       * No stack of arbitrary speed multipliers.
       */
      var leadTime =
        this_.prediction.leadTime;

      var distanceFactor =
        Math.min(
          1.35,
          Math.max(
            0.70,
            this_.targetDistance / 12
          )
        );

      leadTime *=
        distanceFactor;

      var leadX =
        this_.velocity.x *
        leadTime;

      var leadZ =
        this_.velocity.z *
        leadTime;

      /*
       * Vertical velocity is intentionally handled separately.
       * This keeps airborne targets trackable without letting a
       * sudden Y velocity completely redirect target selection.
       */
      var leadY =
        this_.velocity.y *
        (
          leadTime * 0.75
        );

      var horizontalLead =
        Math.hypot(
          leadX,
          leadZ
        );

      if(
        horizontalLead >
        this_.prediction.maxLead
      ) {

        var horizontalScale =
          this_.prediction.maxLead /
          horizontalLead;

        leadX *=
          horizontalScale;

        leadZ *=
          horizontalScale;
      }

      point.x +=
        leadX;

      point.y +=
        leadY;

      point.z +=
        leadZ;

      /*
       * Never let prediction fall below the upper half of the
       * rendered target.
       */
      var box =
        new THREE.Box3().setFromObject(
          player
        );

      if(!box.isEmpty()) {

        var minAimY =
          box.min.y +
          (
            box.max.y -
            box.min.y
          ) *
          0.55;

        if(
          point.y <
          minAimY
        ) {

          point.y =
            minAimY;
        }
      }

      return point;

    } catch(e) {

      return this_.getBetterAimPoint(
        player
      );

    }
  };

  this_.resetPrediction = function() {

    this_.velocity.set(
      0,
      0,
      0
    );

  };

}, function(this_) {

  try {

    if(
      !window.scene ||
      !window.camera
    ) {

      this_.target = null;
      this_.targetDistance = Infinity;
      this_.angleY = 0;
      this_.screenY = null;

      this_.resetPrediction();

      this_.type = "";

      return;
    }

    var localPlayer =
      scene.children[0]
        .children[6]
        .children[0];

    if(!localPlayer) return;

    var players =
      scene.children[0]
        .children[10]
        .children;

    // ==========================================================
    // KEEP TARGET
    // ==========================================================

    if(this_.target) {

      if(
        !players.includes(this_.target) ||
        !this_.target.visible
      ) {

        this_.target = null;
        this_.targetDistance = Infinity;

        this_.angleY = 0;
        this_.screenY = null;

        this_.resetPrediction();

      } else {

        /*
         * Distance used for maintaining the lock is ALSO
         * horizontal only.
         */
        var dx =
          this_.target.position.x -
          localPlayer.position.x;

        var dz =
          this_.target.position.z -
          localPlayer.position.z;

        var horizontalDistance =
          Math.hypot(
            dx,
            dz
          );

        if(
          horizontalDistance >
          this_.maxDistance
        ) {

          this_.target = null;
          this_.targetDistance = Infinity;

          this_.angleY = 0;
          this_.screenY = null;

          this_.resetPrediction();

        } else {

          this_.targetDistance =
            horizontalDistance;
        }
      }
    }

    // ==========================================================
    // ACQUIRE TARGET HORIZONTALLY
    // ==========================================================

    if(!this_.target) {

      var closest = null;
      var closestDistance =
        this_.maxDistance;

      players.forEach(function(player) {

        try {

          if(
            !player ||
            !player.visible
          ) {
            return;
          }

          if(
            !player.children ||
            !player.children[1] ||
            player.children[1].type !== "Sprite"
          ) {
            return;
          }

          if(
            player === localPlayer
          ) {
            return;
          }

          /*
           * IMPORTANT:
           *
           * Ignore Y completely when choosing who to target.
           */
          var dx =
            player.position.x -
            localPlayer.position.x;

          var dz =
            player.position.z -
            localPlayer.position.z;

          var horizontalDistance =
            Math.hypot(
              dx,
              dz
            );

          if(
            horizontalDistance <
            closestDistance
          ) {

            closestDistance =
              horizontalDistance;

            closest =
              player;
          }

        } catch(e) {}

      });

      if(!closest) {

        this_.type = "";

        return;
      }

      this_.target =
        closest;

      this_.targetDistance =
        closestDistance;

      this_.angleY = 0;
      this_.screenY = null;

      this_.resetPrediction();
    }

    // ==========================================================
    // PREDICTION — MAX PRIORITY
    // ==========================================================

    if(
      this_.config["Prediction"]
    ) {

      var predictedPoint =
        this_.getPredictedAimPoint(
          this_.target
        );

      if(!predictedPoint) {
        return;
      }

      /*
       * getBetterAimDelta calculates BOTH:
       *
       * yaw = horizontal direction
       * pitch = vertical direction
       */
      var delta =
        this_.getBetterAimDelta(
          predictedPoint
        );

      if(!delta) {
        return;
      }

      /*
       * Tiny deadzone only.
       * No smoothing and no correction accumulation.
       */
      if(
        Math.abs(delta.x) <
        0.5
      ) {
        delta.x = 0;
      }

      if(
        Math.abs(delta.y) <
        0.5
      ) {
        delta.y = 0;
      }

      /*
       * Do not let very-close prediction make the camera
       * violently move vertically.
       */
      if(
        this_.targetDistance <= 1.5
      ) {

        delta.y = 0;

      }

      if(
        delta.x === 0 &&
        delta.y === 0
      ) {

        this_.type =
          "PREDICT LOCK " +
          Math.round(
            this_.targetDistance * 10
          ) / 10 +
          "m";

        return;
      }

      var canvas =
        this_.getCanvas();

      if(!canvas) {
        return;
      }

      var element =
        document.pointerLockElement ||
        canvas;

      /*
       * EXACTLY ONE camera event.
       */
      element.dispatchEvent(
        new MouseEvent(
          "mousemove",
          {
            bubbles: true,
            cancelable: true,

            movementX:
              delta.x,

            movementY:
              delta.y,

            clientX:
              innerWidth / 2,

            clientY:
              innerHeight / 2
          }
        )
      );

      this_.type =
        "PREDICT LOCK " +
        Math.round(
          this_.targetDistance * 10
        ) / 10 +
        "m";

      return;
    }

    // ==========================================================
    // LOCKIN
    // ==========================================================

    if(
      this_.config["LockIn"]
    ) {

      var lockPoint =
        this_.getBetterAimPoint(
          this_.target
        );

      if(!lockPoint) {
        return;
      }

      var lockDelta =
        this_.getBetterAimDelta(
          lockPoint
        );

      if(!lockDelta) {
        return;
      }

      if(
        Math.abs(lockDelta.x) <
        0.5
      ) {
        lockDelta.x = 0;
      }

      if(
        Math.abs(lockDelta.y) <
        0.5
      ) {
        lockDelta.y = 0;
      }

      if(
        this_.targetDistance <= 1.5
      ) {
        lockDelta.y = 0;
      }

      if(
        lockDelta.x === 0 &&
        lockDelta.y === 0
      ) {

        this_.type =
          "LOCKED " +
          Math.round(
            this_.targetDistance * 10
          ) / 10 +
          "m";

        return;
      }

      var lockCanvas =
        this_.getCanvas();

      if(!lockCanvas) {
        return;
      }

      var lockElement =
        document.pointerLockElement ||
        lockCanvas;

      lockElement.dispatchEvent(
        new MouseEvent(
          "mousemove",
          {
            bubbles: true,
            cancelable: true,

            movementX:
              lockDelta.x,

            movementY:
              lockDelta.y,

            clientX:
              innerWidth / 2,

            clientY:
              innerHeight / 2
          }
        )
      );

      this_.type =
        "LOCKED " +
        Math.round(
          this_.targetDistance * 10
        ) / 10 +
        "m";

      return;
    }

    // ==========================================================
    // BETTER AIM
    // ==========================================================

    if(
      this_.config["BetterAim"]
    ) {

      var betterAimPoint =
        this_.getBetterAimPoint(
          this_.target
        );

      if(!betterAimPoint) {
        return;
      }

      var betterDelta =
        this_.getBetterAimDelta(
          betterAimPoint
        );

      if(!betterDelta) {
        return;
      }

      if(
        Math.abs(betterDelta.x) <
        0.5
      ) {
        betterDelta.x = 0;
      }

      if(
        Math.abs(betterDelta.y) <
        0.5
      ) {
        betterDelta.y = 0;
      }

      if(
        betterDelta.x === 0 &&
        betterDelta.y === 0
      ) {

        this_.type =
          "BETTER LOCK " +
          Math.round(
            this_.targetDistance * 10
          ) / 10 +
          "m";

        return;
      }

      var betterCanvas =
        this_.getCanvas();

      if(!betterCanvas) {
        return;
      }

      var betterElement =
        document.pointerLockElement ||
        betterCanvas;

      betterElement.dispatchEvent(
        new MouseEvent(
          "mousemove",
          {
            bubbles: true,
            cancelable: true,

            movementX:
              betterDelta.x,

            movementY:
              betterDelta.y,

            clientX:
              innerWidth / 2,

            clientY:
              innerHeight / 2
          }
        )
      );

      this_.type =
        "BETTER LOCK " +
        Math.round(
          this_.targetDistance * 10
        ) / 10 +
        "m";

      return;
    }

    // ==========================================================
    // NORMAL / IMPROVE TURN
    // ==========================================================

    var aimPos =
      this_.target.getWorldPosition(
        new THREE.Vector3()
      );

    aimPos.y += 1.15;

    var horizontalError =
      this_.getHorizontalError(
        aimPos
      );

    if(horizontalError === null) {
      return;
    }

    if(
      this_.config["ImproveTurn"]
    ) {

      this_.angleY =
        horizontalError;

    } else {

      this_.angleY +=
        (
          horizontalError -
          this_.angleY
        ) *
        this_.angleSmooth;
    }

    this_.angleY =
      Math.atan2(
        Math.sin(this_.angleY),
        Math.cos(this_.angleY)
      );

    var verticalScreen =
      this_.getVerticalScreen(
        aimPos
      );

    if(verticalScreen !== null) {

      var verticalSmooth =
        this_.config["ImproveTurn"]
          ? 0.75
          : this_.targetSmooth;

      if(this_.screenY === null) {

        this_.screenY =
          verticalScreen;

      } else {

        this_.screenY +=
          (
            verticalScreen -
            this_.screenY
          ) *
          verticalSmooth;
      }
    }

    var centerY =
      innerHeight / 2;

    var verticalError =
      this_.screenY !== null
        ? this_.screenY - centerY
        : 0;

    if(
      !this_.config["ImproveTurn"] &&
      Math.abs(this_.angleY) <
      this_.deadzoneX
    ) {

      this_.angleY = 0;
    }

    if(
      Math.abs(verticalError) <
      this_.deadzoneY
    ) {

      verticalError = 0;
    }

    var moveX =
      this_.angleY *
      this_.gainX;

    var moveY =
      verticalError *
      this_.gainY;

    if(
      this_.config["ImproveTurn"]
    ) {

      var absAngle =
        Math.abs(this_.angleY);

      if(absAngle > 0.25) {

        moveX *= 3.5;

      } else if(absAngle > 0.08) {

        moveX *= 2.25;

      } else {

        moveX *= 1.25;
      }

      if(
        Math.abs(verticalError) >
        100
      ) {

        moveY *= 2.0;
      }
    }

    moveX =
      Math.max(
        -this_.maxMouseX,
        Math.min(
          this_.maxMouseX,
          moveX
        )
      );

    moveY =
      Math.max(
        -this_.maxMouseY,
        Math.min(
          this_.maxMouseY,
          moveY
        )
      );

    if(
      Math.abs(moveX) <
      0.05
    ) {
      moveX = 0;
    }

    if(
      Math.abs(moveY) <
      0.05
    ) {
      moveY = 0;
    }

    if(
      moveX === 0 &&
      moveY === 0
    ) {

      this_.type =
        (
          this_.config["ImproveTurn"]
            ? "IMPROVED "
            : ""
        ) +
        "LOCK " +
        Math.round(
          this_.targetDistance * 10
        ) / 10 +
        "m";

      return;
    }

    var normalCanvas =
      this_.getCanvas();

    if(!normalCanvas) {
      return;
    }

    var normalElement =
      document.pointerLockElement ||
      normalCanvas;

    normalElement.dispatchEvent(
      new MouseEvent(
        "mousemove",
        {
          bubbles: true,
          cancelable: true,

          movementX:
            moveX,

          movementY:
            moveY,

          clientX:
            innerWidth / 2,

          clientY:
            innerHeight / 2
        }
      )
    );

    this_.type =
      (
        this_.config["ImproveTurn"]
          ? "IMPROVED "
          : ""
      ) +
      "LOCK " +
      Math.round(
        this_.targetDistance * 10
      ) / 10 +
      "m";

  } catch(e) {

    console.warn(
      "[Aimbot]",
      e
    );

  }

}, function(this_) {

  this_.target = null;
  this_.targetDistance = Infinity;

  this_.angleY = 0;
  this_.screenY = null;

  this_.canvas = null;

  this_.resetPrediction();

}, "aimbot",
"Locks aim onto the nearest player",
"n",
1,
{
  "ImproveTurn": {
    type: 0,
    defaultValue: false
  },

  "BetterAim": {
    type: 0,
    defaultValue: false
  },

  "LockIn": {
    type: 0,
    defaultValue: false
  },

  "Prediction": {
    type: 0,
    defaultValue: false
  }
});
