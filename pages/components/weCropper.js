Page({
  data: {
    id: 'cropper',
    width: 600,
    height: 600,
    minScale: 1,
    maxScale: 2.5,
    minRotateAngle: 45, //判断发生旋转的最小角度
    src: '../../test.jpg',
  },
  getDevice() {
    let self = this
    !self.device && (self.device = wx.getSystemInfoSync())
    return self.device
  },
  chooseImg: function () {
    var self = this
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'], // 可以指定是原图还是压缩图，默认二者都有
      sourceType: ['album', 'camera'], // 可以指定来源是相册还是相机，默认二者都有
      success: function (res) {
        // 返回选定照片的本地文件路径列表，tempFilePath可以作为img标签的src属性显示图片
        var tempFilePaths = res.tempFilePaths
        self.setData({
          src: tempFilePaths[0]
        })
        self.onLoad()
      }
    })
  },
  initCanvas(src) {
    let self = this
    wx.getImageInfo({
      src,
      success(res) {
        let { id, width, height } = self.data
        let device = self.getDevice()
        let aspectRatio = res.height / res.width

        self.aspectRatio = aspectRatio
        self.cropperTarget = src
        //裁剪尺寸
        self.cropperWidth = width * device.windowWidth / 750
        self.cropperHeight = height * device.windowWidth / 750

        var minRatio = res.height / self.cropperHeight
        if (minRatio > res.width / self.cropperWidth) {
          minRatio = res.width / self.cropperWidth
        }
        //图片放缩的尺寸
        self.scaleWidth = res.width / minRatio
        self.scaleHeight = res.height / minRatio
        self.initScaleWidth = self.scaleWidth
        self.initScaleHeight = self.scaleHeight
        //canvas绘图起始点（注意原点会被移动到canvas区域的中心）
        if (self.cropperWidth < self.scaleWidth) {
          self.startX = (self.cropperWidth - self.scaleWidth) / 2 - self.cropperWidth / 2
          self.startY = -self.cropperHeight / 2
        } else {
          self.startX = -self.cropperWidth / 2
          self.startY = (self.cropperHeight - self.scaleHeight) / 2 - self.cropperHeight / 2
        }

        self.oldScale = 1
        self.rotate = 0 //单位：°

        //  画布绘制图片
        self.ctx = wx.createCanvasContext(id)
        self.ctx.translate(self.cropperWidth / 2, self.cropperHeight / 2)
        self.ctx.drawImage(src, self.startX, self.startY, self.scaleWidth, self.scaleHeight)
        self.ctx.draw()
      }
    })
  },
  //  图片手势初始监测
  uploadScaleStart(e) {
    let self = this
    let xMove, yMove
    let [touch0, touch1] = e.touches
    self.touchNum = 0 //初始化，用于控制旋转结束时，旋转动作只执行一次

    //计算第一个触摸点的位置，并参照该点进行缩放
    self.touchX = touch0.x
    self.touchY = touch0.y
    self.imgLeft = self.startX
    self.imgTop = self.startY

    // 单指手势时触发
    e.touches.length === 1 && (self.timeOneFinger = e.timeStamp)

    // 两指手势触发
    if (e.touches.length >= 2) {
      self.initLeft = self.imgLeft / self.oldScale
      self.initTop = self.imgTop / self.oldScale

      //计算两指距离
      xMove = touch1.x - touch0.x
      yMove = touch1.y - touch0.y
      self.oldDistance = Math.sqrt(xMove * xMove + yMove * yMove)
      self.oldSlope = yMove / xMove
    }
  },
  //图片手势动态缩放
  uploadScaleMove: function (e) {
    var self = this
    fn(self, e)
    // drawOnTouchMove(self, e)
  },
  uploadScaleEnd(e) {
    let self = this
    self.oldScale = self.newScale || self.oldScale
    self.startX = self.imgLeft || self.startX
    self.startY = self.imgTop || self.startY
    //此处操作目的是防止旋转发生两次
    self.touchNum = self.touchNum + 1
    if (self.touchNum >= 2) {
      console.log('oldSlope:' + self.oldSlope)
      var includedAngle = Math.atan(
        Math.abs(
          (self.newSlope - self.oldSlope) / (1 - self.newSlope * self.oldSlope)
        )
      ) //夹角公式
      if (includedAngle > self.data.minRotateAngle * Math.PI / 180) {
        var direction = self.newSlope > self.oldSlope ? 1 : -1 //旋转方向
        //旋转角度，范围{0,90,180,270}
        self.rotate = ((self.rotate + direction * 90) % 360 + 360) % 360
        console.log('rotate:' + self.rotate)
        self.ctx.translate(self.cropperWidth / 2, self.cropperHeight / 2)
        self.ctx.rotate(self.rotate * Math.PI / 180)
        self.ctx.drawImage(self.cropperTarget, self.imgLeft, self.imgTop, self.scaleWidth, self.scaleHeight)
        self.ctx.draw()
      }
    }
  },
  getCropperImage() {
    let self = this
    let { id } = self.data

    wx.canvasToTempFilePath({
      canvasId: id,
      success(res) {
        wx.previewImage({
          current: '', // 当前显示图片的http链接
          urls: [res.tempFilePath], // 需要预览的图片http链接列表
        })
      }
    })
  },
  onLoad(option) {
    let self = this
    let { src } = self.data
    self.initCanvas(src)
  }
})

/**
 * fn:延时调用函数
 * delay:延迟多长时间
 * mustRun:至少多长时间触发一次
 */
var throttle = function (fn, delay, mustRun) {
  var timer = null,
    previous = null;

  return function () {
    var now = +new Date(),
      context = this,
      args = arguments;
    if (!previous) previous = now;
    var remaining = now - previous;
    if (mustRun && remaining >= mustRun) {
      fn.apply(context, args);
      previous = now;
    } else {
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(context, args);
      }, delay);

    }
  }
}

function drawOnTouchMove(self, e) {
  console.log('run drawOnTouchMove')
  let { minScale, maxScale } = self.data
  let [touch0, touch1] = e.touches
  let xMove, yMove, newDistance, newSlope

  if (e.timeStamp - self.timeOneFinger < 100) {//touch时长过短，忽略
    return
  }

  // 单指手势时触发
  if (e.touches.length === 1) {
    //计算单指移动的距离
    xMove = touch0.x - self.touchX
    yMove = touch0.y - self.touchY
    //转换移动距离到正确的坐标系下
    var tempX = xMove, tempY = yMove
    if (self.rotate == 90) {
      xMove = tempY
      yMove = -tempX
    } else if (self.rotate == 180) {
      xMove = -tempX
      yMove = -tempY
    } else if (self.rotate == 270) {
      xMove = -tempY
      yMove = tempX
    }

    self.imgLeft = self.startX + xMove
    self.imgTop = self.startY + yMove

    avoidCrossBorder(self)

    self.ctx.translate(self.cropperWidth / 2, self.cropperHeight / 2)
    self.ctx.rotate(self.rotate * Math.PI / 180)
    self.ctx.drawImage(self.cropperTarget, self.imgLeft, self.imgTop, self.scaleWidth, self.scaleHeight)
    self.ctx.draw()
  }
  // 两指手势触发
  if (e.touches.length >= 2) {
    // self.timeMoveTwo = e.timeStamp
    // 计算二指最新距离
    xMove = touch1.x - touch0.x
    yMove = touch1.y - touch0.y
    newDistance = Math.sqrt(xMove * xMove + yMove * yMove)
    self.newSlope = yMove / xMove

    //  使用0.005的缩放倍数具有良好的缩放体验
    self.newScale = self.oldScale + 0.005 * (newDistance - self.oldDistance)

    //  设定缩放范围
    self.newScale <= minScale && (self.newScale = minScale)
    self.newScale >= maxScale && (self.newScale = maxScale)

    self.scaleWidth = self.newScale * self.initScaleWidth
    self.scaleHeight = self.newScale * self.initScaleHeight
    self.imgLeft = self.newScale * self.initLeft
    self.imgTop = self.newScale * self.initTop

    avoidCrossBorder(self)

    self.ctx.translate(self.cropperWidth / 2, self.cropperHeight / 2)
    self.ctx.rotate(self.rotate * Math.PI / 180)
    self.ctx.drawImage(self.cropperTarget, self.imgLeft, self.imgTop, self.scaleWidth, self.scaleHeight)
    self.ctx.draw()
  }
}
//防止图片超出canvas边界
function avoidCrossBorder(self) {
  if (self.imgLeft < -(self.scaleWidth - self.cropperWidth / 2)) {
    self.imgLeft = -(self.scaleWidth - self.cropperWidth / 2)
  } else if (self.imgLeft > -self.cropperWidth / 2) {
    self.imgLeft = -self.cropperWidth / 2
  }
  if (self.imgTop < -(self.scaleHeight - self.cropperHeight / 2)) {
    self.imgTop = -(self.scaleHeight - self.cropperHeight / 2)
  } else if (self.imgTop > -self.cropperHeight / 2) {
    self.imgTop = -self.cropperHeight / 2
  }
}
//为drawOnTouchMove函数节流
const fn = throttle(drawOnTouchMove, 100, 100)
