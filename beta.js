// Aimbot
var aimbot = new client.Hack(function(this_) {

  this_.target = null;
  this_.targetName = null;
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
    leadTime: 0.10,
    velocitySmooth: 0.60,
    maxHorizontalLead: 6.0,
    maxVerticalLead: 0.35,
    minSpeed: 0.03
  };

  this_.velocity =
    new THREE.Vector3();

  this_.selectedPlayerName =
    null;

  this_.playerSelector =
    null;

  this_.playerSelectorList =
    null;

  this_.selectorButton =
    null;

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

  this_.getPlayerName = function(player) {

    try {

      var keys = [
        "name",
        "username",
        "displayName",
        "playerName",
        "nickname",
        "nick"
      ];

      for(
        var i = 0;
        i < keys.length;
        i++
      ) {

        var value =
          player[keys[i]];

        if(
          typeof value === "string" &&
          value.trim()
        ) {
          return value.trim();
        }
      }

      var containers = [
        player.userData,
        player.data,
        player.info,
        player.playerData,
        player.profile
      ];

      for(
        var c = 0;
        c < containers.length;
        c++
      ) {

        var obj =
          containers[c];

        if(
          !obj ||
          typeof obj !== "object"
        ) {
          continue;
        }

        for(
          var j = 0;
          j < keys.length;
          j++
        ) {

          var value =
            obj[keys[j]];

          if(
            typeof value === "string" &&
            value.trim()
          ) {
            return value.trim();
          }
        }
      }

    } catch(e) {}

    return null;
  };

  this_.getPlayers = function() {

    try {

      if(
        !window.scene ||
        !scene.children[0] ||
        !scene.children[0].children[10]
      ) {
        return [];
      }

      var localPlayer =
        scene.children[0]
          .children[6]
          .children[0];

      return scene.children[0]
        .children[10]
        .children
        .filter(function(player) {

          try {

            return (
              player &&
              player !== localPlayer &&
              player.visible &&
              player.children &&
              player.children[1] &&
              player.children[1].type === "Sprite"
            );

          } catch(e) {

            return false;
          }

        });

    } catch(e) {

      return [];
    }
  };

  this_.createPlayerSelector = function() {

    try {

      if(this_.playerSelector) {

        this_.updatePlayerSelector();

        this_.playerSelector.style.display =
          "block";

        return;
      }

      var overlay =
        document.createElement("div");

      overlay.style.cssText =
        "position:fixed;" +
        "inset:0;" +
        "z-index:100000;" +
        "background:rgba(0,0,0,.45);";

      var box =
        document.createElement("div");

      box.style.cssText =
        "position:absolute;" +
        "left:50%;" +
        "top:50%;" +
        "transform:translate(-50%,-50%);" +
        "width:300px;" +
        "max-height:65vh;" +
        "overflow:auto;" +
        "padding:10px;" +
        "background:rgba(20,25,40,.98);" +
        "border:1px solid rgba(100,140,220,.6);" +
        "border-radius:8px;" +
        "color:#fff;" +
        "font-family:inherit;";

      var title =
        document.createElement("div");

      title.textContent =
        "Aimbot Targets";

      title.style.cssText =
        "font-weight:bold;" +
        "font-size:16px;" +
        "padding:6px;" +
        "margin-bottom:8px;";

      box.appendChild(title);

      var close =
        document.createElement("button");

      close.textContent =
        "Close";

      close.style.cssText =
        "float:right;" +
        "cursor:pointer;";

      close.onclick = function() {

        overlay.style.display =
          "none";

      };

      box.appendChild(close);

      var list =
        document.createElement("div");

      box.appendChild(list);

      overlay.appendChild(box);
      document.body.appendChild(overlay);

      this_.playerSelector =
        overlay;

      this_.playerSelectorList =
        list;

      this_.updatePlayerSelector();

    } catch(e) {

      console.warn(
        "[Aimbot] Selector error:",
        e
      );

    }
  };

  this_.updatePlayerSelector = function() {

    try {

      if(!this_.playerSelectorList) {
        return;
      }

      var players =
        this_.getPlayers();

      this_.playerSelectorList.innerHTML =
        "";

      var automatic =
        document.createElement("button");

      automatic.textContent =
        "Automatic / Nearest";

      automatic.style.cssText =
        "display:block;" +
        "width:100%;" +
        "padding:8px;" +
        "margin:4px 0;" +
        "cursor:pointer;";

      automatic.onclick = function() {

        this_.selectedPlayerName =
          null;

        this_.target =
          null;

        this_.targetName =
          null;

        this_.resetPrediction();

        this_.playerSelector.style.display =
          "none";
      };

      this_.playerSelectorList.appendChild(
        automatic
      );

      players.forEach(function(player, index) {

        var name =
          this_.getPlayerName(player);

        if(!name) {
          name =
            "Player " + (index + 1);
        }

        var button =
          document.createElement("button");

        button.textContent =
          name;

        button.style.cssText =
          "display:block;" +
          "width:100%;" +
          "padding:8px;" +
          "margin:4px 0;" +
          "cursor:pointer;" +
          "color:#fff;" +
          "background:" +
          (
            this_.selectedPlayerName === name
              ? "rgba(70,160,90,.45)"
              : "rgba(255,255,255,.08)"
          ) +
          ";" +
          "border:0;" +
          "border-radius:5px;";

        button.onclick =
          function(selectedName) {

            return function() {

              this_.selectedPlayerName =
                selectedName;

              this_.target =
                null;

              this_.targetName =
                selectedName;

              this_.resetPrediction();

              this_.playerSelector.style.display =
                "none";

            };

          }(name);

        this_.playerSelectorList.appendChild(
          button
        );

      }, this_);

    } catch(e) {

      console.warn(
        "[Aimbot] Player list error:",
        e
      );

    }
  };

  this_.findSelectedPlayer = function() {

    if(!this_.selectedPlayerName) {
      return null;
    }

    var players =
      this_.getPlayers();

    for(
      var i = 0;
      i < players.length;
      i++
    ) {

      var name =
        this_.getPlayerName(
          players[i]
        );

      if(
        name ===
        this_.selectedPlayerName
      ) {

        return players[i];
      }
    }

    return null;
  };

  this_.getHorizontalError = function(worldPos) {

    try {

      if(!window.camera) {
        return null;
      }

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

      if(!window.camera) {
        return null;
      }

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
        new THREE.Box3().setFromObject(
          player
        );

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

  this_.getBetterAimDelta = function(worldPos) {

    try {

      if(!window.camera) {
        return null;
      }

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

      var leadTime =
        this_.prediction.leadTime *
        Math.min(
          1.30,
          Math.max(
            0.80,
            this_.targetDistance / 12
          )
        );

      var leadX =
        this_.velocity.x *
        leadTime;

      var leadZ =
        this_.velocity.z *
        leadTime;

      var leadY =
        this_.velocity.y *
        leadTime *
        0.12;

      leadY =
        Math.max(
          -this_.prediction.maxVerticalLead,
          Math.min(
            this_.prediction.maxVerticalLead,
            leadY
          )
        );

      var horizontalLead =
        Math.hypot(
          leadX,
          leadZ
        );

      if(
        horizontalLead >
        this_.prediction.maxHorizontalLead
      ) {

        var scale =
          this_.prediction.maxHorizontalLead /
          horizontalLead;

        leadX *= scale;
        leadZ *= scale;
      }

      point.x += leadX;
      point.y += leadY;
      point.z += leadZ;

      var box =
        new THREE.Box3().setFromObject(
          player
        );

      if(!box.isEmpty()) {

        var minY =
          box.min.y +
          (
            box.max.y -
            box.min.y
          ) * 0.60;

        var maxY =
          box.min.y +
          (
            box.max.y -
            box.min.y
          ) * 0.90;

        point.y =
          Math.max(
            minY,
            Math.min(
              maxY,
              point.y
            )
          );
      }

      return point;

    } catch(e) {

      return this_.getBetterAimPoint(
        player
      );
    }
  };

  this_.resetPrediction = function() {

    if(
      this_.velocity &&
      typeof this_.velocity.set === "function"
    ) {

      this_.velocity.set(
        0,
        0,
        0
      );
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

      this_.resetPrediction();

      this_.type = "";

      return;
    }

    var localPlayer =
      scene.children[0]
        .children[6]
        .children[0];

    if(!localPlayer) {
      return;
    }

    var players =
      this_.getPlayers();

    // ----------------------------------------------------------
    // Selected player always wins
    // ----------------------------------------------------------

    if(this_.selectedPlayerName) {

      var selected =
        this_.findSelectedPlayer();

      if(selected) {

        if(this_.target !== selected) {
          this_.resetPrediction();
        }

        this_.target =
          selected;

        this_.targetName =
          this_.selectedPlayerName;

      } else {

        this_.target = null;

        this_.type =
          "WAITING " +
          this_.selectedPlayerName;

        return;
      }

    }

    // ----------------------------------------------------------
    // Automatic target
    // ----------------------------------------------------------

    if(
      !this_.selectedPlayerName &&
      this_.target
    ) {

      if(
        !players.includes(this_.target) ||
        !this_.target.visible
      ) {

        this_.target = null;
        this_.targetName = null;

        this_.resetPrediction();
      }
    }

    if(
      !this_.selectedPlayerName &&
      !this_.target
    ) {

      var closest = null;
      var closestDistance =
        this_.maxDistance;

      players.forEach(function(player) {

        try {

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

      this_.targetName =
        this_.getPlayerName(
          closest
        );

      this_.resetPrediction();
    }

    if(!this_.target) {
      return;
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

      var delta =
        this_.getBetterAimDelta(
          predictedPoint
        );

      if(!delta) {
        return;
      }

      if(
        Math.abs(delta.x) <
        0.35
      ) {
        delta.x = 0;
      }

      if(
        Math.abs(delta.y) <
        0.75
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
          "PREDICT " +
          (
            this_.selectedPlayerName ||
            "LOCK"
          ) +
          " " +
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
        "PREDICT " +
        (
          this_.selectedPlayerName ||
          "LOCK"
        ) +
        " " +
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

      var lockCanvas =
        this_.getCanvas();

      if(!lockCanvas) {
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
        (
          this_.selectedPlayerName ||
          ""
        ) +
        " " +
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

      var betterCanvas =
        this_.getCanvas();

      if(!betterCanvas) {
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
        (
          this_.selectedPlayerName ||
          ""
        ) +
        " " +
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

        moveY *= 2;
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
  this_.targetName = null;
  this_.targetDistance = Infinity;

  this_.selectedPlayerName = null;

  this_.angleY = 0;
  this_.screenY = null;

  this_.canvas = null;

  if(
    this_.velocity &&
    typeof this_.velocity.set === "function"
  ) {

    this_.velocity.set(
      0,
      0,
      0
    );
  }

  try {

    if(this_.playerSelector) {
      this_.playerSelector.remove();
    }

  } catch(e) {}

  this_.playerSelector = null;
  this_.playerSelectorList = null;

  if(this_.selectorButton) {
    try {
      this_.selectorButton.remove();
    } catch(e) {}
  }

  this_.selectorButton = null;

}, "aimbot",
"Locks aim onto the nearest player or a selected player",
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

/*
 * Add the selector button only after the main client has
 * created the Aimbot menu entry.
 */
(function installSelectorButton() {

  var attempts = 0;

  var timer =
    setInterval(function() {

      try {

        attempts++;

        var element =
          document.getElementById(
            "aimbot"
          );

        if(!element) {

          if(attempts >= 30) {
            clearInterval(timer);
          }

          return;
        }

        if(
          element.querySelector(
            ".cubehc-player-selector-button"
          )
        ) {

          clearInterval(timer);
          return;
        }

        var button =
          document.createElement("button");

        button.className =
          "cubehc-player-selector-button";

        button.textContent =
          "🎯 Select Player";

        button.style.cssText =
          "display:block;" +
          "width:100%;" +
          "margin-top:8px;" +
          "padding:7px;" +
          "cursor:pointer;" +
          "border:0;" +
          "border-radius:5px;" +
          "background:rgba(80,140,255,.25);" +
          "color:#fff;";

        button.onclick =
          function(e) {

            e.preventDefault();
            e.stopPropagation();

            try {
              aimbot.createPlayerSelector();
            } catch(err) {
              console.warn(
                "[Aimbot] Selector:",
                err
              );
            }

          };

        element.appendChild(
          button
        );

        aimbot.selectorButton =
          button;

        clearInterval(timer);

      } catch(e) {

        console.warn(
          "[Aimbot] Selector install:",
          e
        );

      }

    }, 1);

})();
