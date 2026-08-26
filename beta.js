// Aimbot
var aimbot = new client.Hack(function(this_) {

  this_.target = null;
  this_.targetDistance = Infinity;

  this_.maxDistance = 50;

  // ------------------------------------------------------------
  // NORMAL AIM SETTINGS
  // ------------------------------------------------------------

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

  // ------------------------------------------------------------
  // CANVAS
  // ------------------------------------------------------------

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

  // ------------------------------------------------------------
  // NORMAL HORIZONTAL 360° AIM
  // ------------------------------------------------------------

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

  // ------------------------------------------------------------
  // NORMAL VERTICAL SCREEN POSITION
  // ------------------------------------------------------------

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

  // ------------------------------------------------------------
  // BETTER AIM: FIND A REAL UPPER-BODY POINT
  // ------------------------------------------------------------

  this_.getBetterAimPoint = function(player) {

    try {

      /*
       * Use the rendered player's bounding box instead of
       * player.position, because player.position may be near
       * the feet/origin.
       */
      var box =
        new THREE.Box3().setFromObject(player);

      if(box.isEmpty()) {
        return player.getWorldPosition(
          new THREE.Vector3()
        ).add(
          new THREE.Vector3(0, 1.15, 0)
        );
      }

      var min = box.min;
      var max = box.max;

      var height =
        max.y - min.y;

      if(
        !Number.isFinite(height) ||
        height <= 0.05
      ) {

        return player.getWorldPosition(
          new THREE.Vector3()
        ).add(
          new THREE.Vector3(0, 1.15, 0)
        );
      }

      /*
       * Aim around the upper chest/head region.
       *
       * 0.72 means 72% up the rendered body, never the feet.
       */
      var y =
        min.y +
        height * 0.72;

      return new THREE.Vector3(
        (min.x + max.x) / 2,
        y,
        (min.z + max.z) / 2
      );

    } catch(e) {

      return player.getWorldPosition(
        new THREE.Vector3()
      ).add(
        new THREE.Vector3(0, 1.15, 0)
      );

    }
  };

  // ------------------------------------------------------------
  // BETTER AIM: ONE-SHOT CAMERA CORRECTION
  // ------------------------------------------------------------

  this_.getBetterAimDelta = function(worldPos) {

    try {

      if(
        !window.camera ||
        !window.THREE
      ) {
        return null;
      }

      /*
       * Convert target to camera-local coordinates.
       *
       * Three.js cameras look down -Z.
       */
      var local =
        worldPos.clone();

      camera.worldToLocal(local);

      var x = local.x;
      var y = local.y;
      var z = local.z;

      /*
       * Do not attempt a mathematical "snap" if we're basically
       * inside the target. This prevents absurd values at point
       * blank range.
       */
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

      // --------------------------------------------------------
      // EXACT HORIZONTAL ANGLE
      // --------------------------------------------------------

      /*
       * Full 360°.
       */
      var yaw =
        Math.atan2(
          x,
          -z
        );

      // --------------------------------------------------------
      // EXACT VERTICAL ANGLE
      // --------------------------------------------------------

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

      // --------------------------------------------------------
      // CAMERA FOV
      // --------------------------------------------------------

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

      /*
       * Three.js camera.fov is vertical FOV in degrees.
       */
      var verticalFov =
        THREE.MathUtils.degToRad(
          Number(camera.fov) || 60
        );

      var aspect =
        camera.aspect ||
        width / height;

      /*
       * Horizontal FOV derived from vertical FOV.
       */
      var horizontalFov =
        2 *
        Math.atan(
          Math.tan(
            verticalFov / 2
          ) *
          aspect
        );

      // --------------------------------------------------------
      // ANGLE -> SCREEN DELTA
      // --------------------------------------------------------

      /*
       * Convert the angular error to the screen movement needed
       * to put that exact ray onto the center of the screen.
       *
       * This is ONE correction, not a gradual controller.
       */
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

      /*
       * Positive pitch means the target is above the camera.
       * Mouse Y is inverted.
       */
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

      /*
       * Keep a huge but finite safety bound.
       */
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
      this_.type = "";

      return;
    }

    var localPlayer =
      scene.children[0].children[6].children[0];

    if(!localPlayer) return;

    var players =
      scene.children[0].children[10].children;

    // ----------------------------------------------------------
    // KEEP CURRENT LOCK
    // ----------------------------------------------------------

    if(this_.target) {

      if(
        !players.includes(this_.target) ||
        !this_.target.visible
      ) {

        this_.target = null;
        this_.targetDistance = Infinity;
        this_.angleY = 0;
        this_.screenY = null;

      } else {

        var lockedDistance =
          this_.target.position.distanceTo(
            localPlayer.position
          );

        if(
          lockedDistance >
          this_.maxDistance
        ) {

          this_.target = null;
          this_.targetDistance = Infinity;
          this_.angleY = 0;
          this_.screenY = null;

        } else {

          this_.targetDistance =
            lockedDistance;
        }
      }
    }

    // ----------------------------------------------------------
    // ACQUIRE TARGET ONLY WHEN NOT LOCKED
    // ----------------------------------------------------------

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

          if(player === localPlayer) {
            return;
          }

          var distance =
            player.position.distanceTo(
              localPlayer.position
            );

          if(
            distance <
            closestDistance
          ) {

            closestDistance = distance;
            closest = player;

          }

        } catch(e) {}

      });

      if(!closest) {

        this_.type = "";
        return;
      }

      this_.target = closest;
      this_.targetDistance =
        closestDistance;

      this_.angleY = 0;
      this_.screenY = null;
    }

    // ==========================================================
    // BETTER AIM
    // ==========================================================

    if(this_.config["BetterAim"]) {

      /*
       * Get an actual upper-body point from the rendered player.
       * This avoids aiming at player.position, which can be
       * located around the feet.
       */
      var betterAimPoint =
        this_.getBetterAimPoint(
          this_.target
        );

      if(!betterAimPoint) {
        return;
      }

      /*
       * At extremely close range, don't force a vertical snap
       * from an unstable bounding-box projection.
       *
       * Keep the upper-body point, but use the player's body
       * center height as the safer close-range reference.
       */
      if(
        this_.targetDistance <= 1.5
      ) {

        var closeBox =
          new THREE.Box3().setFromObject(
            this_.target
          );

        if(!closeBox.isEmpty()) {

          betterAimPoint.y =
            closeBox.min.y +
            (
              closeBox.max.y -
              closeBox.min.y
            ) *
            0.60;
        }
      }

      /*
       * ONE complete correction.
       *
       * No smoothing.
       * No lerp.
       * No ImproveTurn multiplier.
       * No accumulation.
       */
      var betterDelta =
        this_.getBetterAimDelta(
          betterAimPoint
        );

      if(!betterDelta) {
        return;
      }

      /*
       * Ignore microscopic noise.
       */
      if(
        Math.abs(betterDelta.x) < 0.5
      ) {
        betterDelta.x = 0;
      }

      if(
        Math.abs(betterDelta.y) < 0.5
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

      var canvas =
        this_.getCanvas();

      if(!canvas) {
        return;
      }

      /*
       * One event only.
       *
       * Do not also send another mouse event to document.
       */
      var element =
        document.pointerLockElement ||
        canvas;

      element.dispatchEvent(
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

      /*
       * IMPORTANT:
       *
       * BetterAim completely replaces the normal controller.
       * Do not fall through into the smoothing logic.
       */
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

    if(this_.config["ImproveTurn"]) {

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

    if(this_.config["ImproveTurn"]) {

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

}, "aimbot",
"Locks aim onto the nearest player",
"n",
10,
{
  "ImproveTurn": {
    type: 0,
    defaultValue: false
  },

  "BetterAim": {
    type: 0,
    defaultValue: false
  }
});
