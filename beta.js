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

  this_.prediction = {
    leadTime: 0.085,
    maxHorizontalLead: 5.0,
    maxVerticalLead: 0.18,
    minSpeed: 0.03
  };

  this_.adaptive = {
    leadTime: 0.085,
    minLead: 0.045,
    maxLead: 0.14,
    maxHorizontalLead: 7.0,
    maxVerticalLead: 0.16,
    velocityWeight: 0.35,
    nearDistance: 3.0
  };

  this_.velocity =
    new THREE.Vector3();

  this_.lastPredicted =
    new THREE.Vector3();

  this_.adaptiveVelocity =
    new THREE.Vector3();

  this_.adaptivePoint =
    new THREE.Vector3();

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
        height * 0.60,

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
          x*x +
          y*y +
          z*z
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
          x*x +
          z*z
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

      return {

        x: Math.max(
          -1000000,
          Math.min(
            1000000,
            movementX
          )
        ),

        y: Math.max(
          -256000,
          Math.min(
            256000,
            movementY
          )
        )

      };

    } catch(e) {

      return null;
    }
  };

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

      var horizontalSpeed =
        Math.hypot(
          velocity.x,
          velocity.z
        );

      if(
        horizontalSpeed <
        this_.prediction.minSpeed
      ) {

        return point;
      }

      var leadTime =
        this_.prediction.leadTime;

      var distanceScale =
        Math.min(
          1.20,
          Math.max(
            0.85,
            this_.targetDistance / 12
          )
        );

      leadTime *=
        distanceScale;

      var leadX =
        velocity.x *
        leadTime;

      var leadZ =
        velocity.z *
        leadTime;

      var horizontalLead =
        Math.hypot(
          leadX,
          leadZ
        );

      if(
        horizontalLead >
        this_.prediction.maxHorizontalLead
      ) {

        var horizontalScale =
          this_.prediction.maxHorizontalLead /
          horizontalLead;

        leadX *=
          horizontalScale;

        leadZ *=
          horizontalScale;
      }

      var leadY =
        velocity.y *
        leadTime *
        0.06;

      leadY =
        Math.max(
          -this_.prediction.maxVerticalLead,
          Math.min(
            this_.prediction.maxVerticalLead,
            leadY
          )
        );

      point.x +=
        leadX;

      point.z +=
        leadZ;

      point.y +=
        leadY;

      var box =
        new THREE.Box3().setFromObject(
          player
        );

      if(!box.isEmpty()) {

        var height =
          box.max.y -
          box.min.y;

        var minimumY =
          box.min.y +
          height * 0.58;

        var maximumY =
          box.min.y +
          height * 0.70;

        point.y =
          Math.max(
            minimumY,
            Math.min(
              maximumY,
              point.y
            )
          );
      }

      if(
        this_.lastPredicted &&
        this_.lastPredicted.lengthSq() > 0
      ) {

        point.lerp(
          this_.lastPredicted,
          0.08
        );
      }

      this_.lastPredicted.copy(
        point
      );

      return point;

    } catch(e) {

      return this_.getBetterAimPoint(
        player
      );
    }
  };

  this_.getAdaptiveAimPoint = function(player) {

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

        this_.adaptivePoint.copy(
          point
        );

        return this_.adaptivePoint.clone();
      }

      this_.adaptiveVelocity.lerp(
        velocity,
        this_.adaptive.velocityWeight
      );

      var horizontalSpeed =
        Math.hypot(
          this_.adaptiveVelocity.x,
          this_.adaptiveVelocity.z
        );

      var distance =
        this_.targetDistance;

      var distanceFactor =
        Math.min(
          1.35,
          Math.max(
            0.85,
            distance / 12
          )
        );

      var speedFactor =
        Math.min(
          1.35,
          Math.max(
            0.80,
            0.80 +
            horizontalSpeed * 0.06
          )
        );

      var leadTime =
        this_.adaptive.leadTime *
        distanceFactor *
        speedFactor;

      leadTime =
        Math.max(
          this_.adaptive.minLead,
          Math.min(
            this_.adaptive.maxLead,
            leadTime
          )
        );

      var leadX =
        this_.adaptiveVelocity.x *
        leadTime;

      var leadZ =
        this_.adaptiveVelocity.z *
        leadTime;

      var horizontalLead =
        Math.hypot(
          leadX,
          leadZ
        );

      if(
        horizontalLead >
        this_.adaptive.maxHorizontalLead
      ) {

        var scale =
          this_.adaptive.maxHorizontalLead /
          horizontalLead;

        leadX *= scale;
        leadZ *= scale;
      }

      var leadY =
        this_.adaptiveVelocity.y *
        leadTime *
        0.035;

      leadY =
        Math.max(
          -this_.adaptive.maxVerticalLead,
          Math.min(
            this_.adaptive.maxVerticalLead,
            leadY
          )
        );

      point.x += leadX;
      point.z += leadZ;
      point.y += leadY;

      var box =
        new THREE.Box3().setFromObject(
          player
        );

      if(!box.isEmpty()) {

        var height =
          box.max.y -
          box.min.y;

        var minY =
          box.min.y +
          height * 0.58;

        var maxY =
          box.min.y +
          height * 0.68;

        point.y =
          Math.max(
            minY,
            Math.min(
              maxY,
              point.y
            )
          );
      }

      /*
       * At close range, keep the base body height stable.
       * This prevents unnecessary vertical twitching.
       */
      if(
        distance <=
        this_.adaptive.nearDistance
      ) {

        var currentPoint =
          this_.getBetterAimPoint(
            player
          );

        if(currentPoint) {
          point.y =
            currentPoint.y;
        }
      }

      this_.adaptivePoint.copy(
        point
      );

      return this_.adaptivePoint.clone();

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

    this_.lastPredicted.set(
      0,
      0,
      0
    );

    this_.adaptiveVelocity.set(
      0,
      0,
      0
    );

    this_.adaptivePoint.set(
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

    if(this_.target) {

      if(
        !players.includes(
          this_.target
        ) ||
        !this_.target.visible
      ) {

        this_.target = null;
        this_.targetDistance = Infinity;

        this_.angleY = 0;
        this_.screenY = null;

        this_.resetPrediction();

      } else {

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

          var dx =
            player.position.x -
            localPlayer.position.x;

          var dz =
            player.position.z -
            localPlayer.position.z;

          var distance =
            Math.hypot(
              dx,
              dz
            );

          if(
            distance <
            closestDistance
          ) {

            closestDistance =
              distance;

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

    var dx =
      this_.target.position.x -
      localPlayer.position.x;

    var dz =
      this_.target.position.z -
      localPlayer.position.z;

    this_.targetDistance =
      Math.hypot(
        dx,
        dz
      );

    // ==========================================================
    // ADAPTIVE — MAX PRIORITY
    // ==========================================================

    if(
      this_.config["Adaptive"]
    ) {

      var adaptivePoint =
        this_.getAdaptiveAimPoint(
          this_.target
        );

      if(!adaptivePoint) {
        return;
      }

      var adaptiveDelta =
        this_.getBetterAimDelta(
          adaptivePoint
        );

      if(!adaptiveDelta) {
        return;
      }

      if(
        Math.abs(adaptiveDelta.x) <
        0.12
      ) {
        adaptiveDelta.x = 0;
      }

      if(
        Math.abs(adaptiveDelta.y) <
        0.75
      ) {
        adaptiveDelta.y = 0;
      }

      if(
        adaptiveDelta.x === 0 &&
        adaptiveDelta.y === 0
      ) {

        this_.type =
          "ADAPTIVE LOCK " +
          Math.round(
            this_.targetDistance * 10
          ) / 10 +
          "m";

        return;
      }

      var adaptiveCanvas =
        this_.getCanvas();

      if(!adaptiveCanvas) {
        return;
      }

      var adaptiveElement =
        document.pointerLockElement ||
        adaptiveCanvas;

      adaptiveElement.dispatchEvent(
        new MouseEvent(
          "mousemove",
          {
            bubbles: true,
            cancelable: true,

            movementX:
              adaptiveDelta.x,

            movementY:
              adaptiveDelta.y,

            clientX:
              innerWidth / 2,

            clientY:
              innerHeight / 2
          }
        )
      );

      this_.type =
        "ADAPTIVE LOCK " +
        Math.round(
          this_.targetDistance * 10
        ) / 10 +
        "m";

      return;
    }

    // ==========================================================
    // PREDICTION
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

      var delta =
        this_.getBetterAimDelta(
          predictedPoint
        );

      if(!delta) {
        return;
      }

      if(
        Math.abs(delta.x) <
        0.20
      ) {
        delta.x = 0;
      }

      if(
        Math.abs(delta.y) <
        1.25
      ) {
        delta.y = 0;
      }

      var canvas =
        this_.getCanvas();

      if(!canvas) {
        return;
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

      var lockCanvas =
        this_.getCanvas();

      if(!lockCanvas) {
        return;
      }

      if(
        lockDelta.x !== 0 ||
        lockDelta.y !== 0
      ) {

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
      }

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

      var betterPoint =
        this_.getBetterAimPoint(
          this_.target
        );

      if(!betterPoint) {
        return;
      }

      var betterDelta =
        this_.getBetterAimDelta(
          betterPoint
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

      var betterCanvas =
        this_.getCanvas();

      if(!betterCanvas) {
        return;
      }

      if(
        betterDelta.x !== 0 ||
        betterDelta.y !== 0
      ) {

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
      }

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

      if(this_.screenY === null) {

        this_.screenY =
          verticalScreen;

      } else {

        this_.screenY +=
          (
            verticalScreen -
            this_.screenY
          ) *
          (
            this_.config["ImproveTurn"]
              ? 0.75
              : this_.targetSmooth
          );
      }
    }

    var verticalError =
      this_.screenY !== null
        ? this_.screenY -
          innerHeight / 2
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
        Math.abs(
          this_.angleY
        );

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
  "Adaptive": {
    type: 0,
    defaultValue: false
  },

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
