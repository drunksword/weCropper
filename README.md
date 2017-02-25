# weCropper
图片放缩、旋转、裁剪 for 微信小程序，实现方式是canvas作图
# 使用方法
下载代码，在微信开发者工具中选择相应包路径，打开后可直接查看
# 说明
####项目基础来自这位同学https://github.com/dlhandsome/we-cropper ，增加了旋转功能,优化了些细节。
本来打算做成如下效果（即有个半透明层）：
####
![image](https://github.com/soggotheslitherer/weCropper/blob/master/ideal.jpeg)
####试过两种方法：
####1）在canvas上增加遮罩。--然而小程序里canvas组件是由客户端创建的原生组件，它的层级是最高的。遮罩会被盖住。
####2）两个canvas层叠。--在开发工具上好好的，到手机上就不行了。。
####另外，由于touchMove绑定的函数里有canvas作图，会对手机性能消耗比较严重。推荐上传压缩图，函数节流等。（尽管如此，还是出现了卡顿。。）
####目前只做成这样，凑合着用了。貌似微信以后会出图片裁剪的组件。或者将白俊杰https://github.com/baijunjie/PhotoClip.js 的做法搬到小程序上，静候大神。。
# 最后
求个star^_^
