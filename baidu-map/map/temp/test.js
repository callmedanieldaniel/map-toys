/**
 * @file the map module
 * @author Mofei<zhuwenlong@baidu.com>
 */

/* globals BMap BMapLib*/

import React from 'react';
import Map from '../common/map/map';

// action & store
import actions from './action.js';
import { Action, Store } from 'marine';
import HomeStore from '../home/store';
import MapSearch from './MapSearch.jsx';

class TrafficGuideMap extends Map {
    constructor(args) {
        super(args);
        this.actions = actions
        this.leftBottomPoint = ''
        this.topRightPoint = ''
        this.startEnd = {
            start: null,
            end: null
        };
        this.lbAndTr = {
            leftBottom: null,
            topRight: null
        }
        this.rectBorder = null
        this.map_polylines = []
        this.map_markers = []
        this.editingPolyline = null
        this.mousedownFun = this.mousedownFun.bind(this)
        this.mousemoveFun = this.mousemoveFun.bind(this)
        this.mouseupFun = this.mouseupFun.bind(this)
        this.onClickHandle = this.onClickHandle.bind(this)
        this.state = {
            map:null,
            city: this.props.city,
            screenInfo: this.props.screenInfo || {
                width: 300,
                height: 200
            },
            mapShow: true,
            clicked_points: [],
            bmap_points: [],
            route: [],
            configData: null,
        };
    }

    componentDidMount() {
        let self = this
        self.openMap()
    }

    openMap() {
        const self = this;
        let point = new BMap.Point(116.3131213039, 40.049404649252);
        let centerAndZoom = {
            center: point,
            zoom: 14
        }
        let map = this.initMap(null, centerAndZoom);
        self.state.map = map
        self.openUpdateListener()
    }

    openUpdateListener() {
        let self = this
        let map = this.state.map
        Store.on('guideScreen.screen_detail', (data) => {
            let configData = JSON.parse(data.data.data.detail.configData)
            self.disposalRegionBoundary(configData,"display")
        })
        Store.on('screenAndMap.chose_region_boundary', data => {
            self.disposalRegionBoundary(data)
        });
        Store.on('guideScreen.route_plan', data => {
            let route = (data.data.data.route) || [];
            self.setState({ "route": route }, function () {
                self.organizeLine();
            });
        });
        Store.on('screenAndMap.get_road_from_map', data => {
            self.setState({ configData: data.data })
            self.getRoute()
            Store.on("screenAndMap.editing_road", data => {
                let signal = data.data
                if (signal == "reset") {
                    self.clearAll()
                    self.getRoute()
                }
                if (signal == "cancel") {
                    self.clearAll()
                    map.removeEventListener("click", self.onClickHandle)
                }
            })
        });
        Store.on("screenAndMap.show_chosed_item_on_canvas_and_map", data => {
            let info = data.data
            let index = info.index
            let item = info.item
            console.log("map received data")
            console.log(index,item)
            if(item.type == "Road"){
                self.displayChosedRoadOnMap(item)
            }

        })
    }
    displayChosedRoadOnMap(item){
        this.editingPolyline != null ? this.editingPolyline.remove() : ""
        let points = []
        item.path.steps.map((step)=>{
            let stepPoints = step.points.map((p)=>{
                return  new BMap.Point(p[0],p[1])
            })
            points=[...points,...stepPoints]
        })
        var polyline = new BMap.Polyline(points, {strokeColor:"blue", strokeWeight:6, strokeOpacity:0.5});   //创建折线
        this.state.map.addOverlay(polyline);   //增加折线
        this.editingPolyline = polyline
        let clicked_points = this.state.clicked_points
        clicked_points.length = 0
        clicked_points.push(item.path.start)
        clicked_points.push(item.path.end)
        console.log("displayChosedRoadOnMap")
        console.log(clicked_points)
        this.setState({clicked_points:clicked_points},this.organizeClickedPointsOnMap())
    }

    disposalRegionBoundary(configData,type) {
        let self = this
        console.warn(configData)
        self.setState({ configData: configData })
        if (configData.global && configData.global.boundingBox && configData.global.boundingBox.length == 2) {
            self.displayRegionBoundary()
        } else {
            self.choseRegionBoundary(self)
        }
    }
    displayRegionBoundary() {
        let self = this
        let map = this.state.map
        let global = self.state.configData.global
        let leftBottom = global.boundingBox[0]
        let rightTop = global.boundingBox[1]
        let points = [
            new BMap.Point(leftBottom[0], leftBottom[1]),
            new BMap.Point(leftBottom[0], rightTop[1]),
            new BMap.Point(rightTop[0], rightTop[1]),
            new BMap.Point(rightTop[0], leftBottom[1])
        ]
        map.setViewport(points)
        let polygon = new BMap.Polygon(points, { strokeColor: "blue", strokeWeight: 2, strokeOpacity: 1, fillOpacity: 0.15, fillColor: "green" });  //创建多边形
        console.log("boundingBox================setview")
        console.warn(points)
        self.rectBorder = polygon
        polygon.disableMassClear()
        map.addOverlay(polygon);   //增加多边形

    }
    choseRegionBoundary(p) {
        let self = p
        let map = this.state.map
        map.disableDragging()
        map.addEventListener('mousedown', self.mousedownFun)
        //        map.removeEventListener("mouseup",mouseupFun)
    }

    mousedownFun(e) {
        let self = this
        let map = this.state.map
        self.startEnd.start = e.pixel
        // self.lbAndTr.leftBottom = e.point
        map.addEventListener("mousemove", self.mousemoveFun)
        map.addEventListener("mouseup", self.mouseupFun)
    }

    mousemoveFun(e) {
        let self = this
        self.startEnd.end = e.pixel
        // self.lbAndTr.topRight = e.point
        self.drawRectBorder()
    }

    mouseupFun(e) {
        let self = this
        let map = this.state.map
        self.startEnd.end = e.pixel
        map.removeEventListener("mousemove", self.mousemoveFun)
        map.removeEventListener("mouseup", self.mouseupFun)
        map.enableDragging()
        Action.screenAndMap.changeRegionBoundary(self.lbAndtr)
    }

    drawRectBorder() {
        let self = this
        let map = this.state.map
        let swh = self.state.configData.global
        var pixelxy = {
            xmax: self.startEnd.start.x > self.startEnd.end.x ? self.startEnd.start.x : self.startEnd.end.x,
            xmin: self.startEnd.start.x < self.startEnd.end.x ? self.startEnd.start.x : self.startEnd.end.x,
            ymax: self.startEnd.start.y > self.startEnd.end.y ? self.startEnd.start.y : self.startEnd.end.y,
            ymin: self.startEnd.start.y < self.startEnd.end.y ? self.startEnd.start.y : self.startEnd.end.y,
        }
        let scale = swh.height > swh.width ? swh.height / swh.width : swh.width / swh.height
        let xDif = pixelxy.xmax - pixelxy.xmin
        let yDif = pixelxy.ymax - pixelxy.ymin

        if (self.startEnd.end.x > self.startEnd.start.x && self.startEnd.end.y > self.startEnd.start.y) {
            if (xDif < yDif) {
                pixelxy.xmax = pixelxy.xmin + yDif / scale
            } else {
                pixelxy.ymax = pixelxy.ymin + xDif / scale
            }
        }
        if (self.startEnd.end.x > self.startEnd.start.x && self.startEnd.end.y < self.startEnd.start.y) {
            if (xDif < yDif) {
                pixelxy.xmax = pixelxy.xmin + yDif / scale
            } else {
                pixelxy.ymin = pixelxy.ymax - xDif / scale
            }
        }
        if (self.startEnd.end.x < self.startEnd.start.x && self.startEnd.end.y > self.startEnd.start.y) {
            if (xDif < yDif) {
                pixelxy.xmin = pixelxy.xmax - yDif / scale
            } else {
                pixelxy.ymax = pixelxy.ymin + xDif / scale
            }
        }
        if (self.startEnd.end.x < self.startEnd.start.x && self.startEnd.end.y < self.startEnd.start.y) {
            if (xDif < yDif) {
                pixelxy.xmin = pixelxy.xmax - yDif / scale
            } else {
                pixelxy.ymin = pixelxy.ymax - xDif / scale
            }
        }

        let leftBottom = map.pixelToPoint({ x: pixelxy.xmin, y: pixelxy.ymin })
        let leftTop = map.pixelToPoint({ x: pixelxy.xmin, y: pixelxy.ymax })
        let rightTop = map.pixelToPoint({ x: pixelxy.xmax, y: pixelxy.ymax })
        let rightBottom = map.pixelToPoint({ x: pixelxy.xmax, y: pixelxy.ymin })

        self.lbAndtr = {
            leftBottom: leftBottom,
            rightTop: rightTop
        }

        let points = [
            new BMap.Point(leftBottom.lng, leftBottom.lat),
            new BMap.Point(leftTop.lng, leftTop.lat),
            new BMap.Point(rightTop.lng, rightTop.lat),
            new BMap.Point(rightBottom.lng, rightBottom.lat)
        ]
        if (self.rectBorder != null) {
            self.rectBorder.setPath(points)
        } else {
            let polygon = new BMap.Polygon(points, { strokeColor: "blue", strokeWeight: 2, strokeOpacity: 1, fillOpacity: 0.15, fillColor: "green" });  //创建多边形
            self.rectBorder = polygon
            map.addOverlay(polygon);   //增加多边形
        }

    }

    getRoute() {
        let self = this
        let map = this.state.map
        self.clearAll()
        map.addEventListener("click", self.onClickHandle)
    }
    clearAll() {
        let self = this
        let map = this.state.map
        map.clearOverlays()
        map.removeEventListener("click", self.onClickHandle)
        var allOverlay = map.getOverlays()
        self.map_polylines.forEach((layer) => {
            map.removeOverlay(layer)
        })
        self.map_polylines.length = 0
        self.state.clicked_points.length = 0
        self.state.bmap_points.length = 0
        self.state.route.length = 0

    }
    onClickHandle(e) {
        let self = this
        self.setState({ 'clicked_points': [...this.state.clicked_points, e.point] })
        self.planRoute()
    }

    planRoute(){
        let self = this
        let map = this.state.map
        map.clearOverlays()

        let origin = self.state.clicked_points[0]
        let destination = self.state.clicked_points[1]
        let width = self.state.configData.global.width
        let height = self.state.configData.global.height
        let leftBottomPoint = self.state.configData.global.boundingBox[0]
        let topRightPoint = self.state.configData.global.boundingBox[1]
        self.organizeClickedPointsOnMap()
        if (self.state.clicked_points.length > 1) {
            Action.guideScreen.routePlan(origin, destination, leftBottomPoint, topRightPoint, width, height)
        }
    }

    organizeLine() {
        let self = this
        let map = this.state.map

        self.state.route.map((road) => {
            let points = road.points.map((p) => {
                return new BMap.Point(p[0], p[1])
            })
            let polyline = new BMap.Polyline(points,
                { strokeColor: 'blue', strokeWeight: 6, strokeOpacity: 0.5 }
            );
            self.map_polylines.push(polyline)
            map.addOverlay(polyline);

        })

        let p = self.state.clicked_points
        let path = {
            start: [p[0].lng, p[0].lat],
            end: [p[1].lng, p[1].lat],
            steps: self.state.route
        }
        Action.screenAndMap.addRoadToScreen(path)
        map.removeEventListener("click", self.onClickHandle)
    }

    organizeClickedPointsOnMap() {
        let self = this
        let map = this.state.map
        self.map_markers.forEach((marker) => {
            map.removeOverlay(marker)
        })
        let points = self.state.clicked_points
        console.log("organizeClickedPointsOnMap")
        console.log(points)

        //创建小狐狸
        points.map((pt, index) => {
            if(pt instanceof Array){
                pt = {
                    lng:pt[0],
                    lat:pt[1]
                }
            }
            let tempImg = "http://lbsyun.baidu.com/jsdemo/img/fox.gif"
            let Icon = index == 0 ? '../../../static/images/start.png' : "../../../static/images/end.png"
            let myIcon = new BMap.Icon(Icon, new BMap.Size(32, 32), { imageSize: new BMap.Size(32, 32) });
            let marker2 = new BMap.Marker(new BMap.Point(pt.lng, pt.lat), { icon: myIcon });  // 创建标注
            // 将点击点添加到地图中
            map.addOverlay(marker2);
            self.map_markers.push(marker2)
            marker2.enableDragging()
            marker2.addEventListener('dragend', (e) => {
                console.log("dragging")
                console.log(e.point)
                let p = new BMap.Point(e.point.lng,e.point.lat)
                marker2.setPosition(p)
                points[index]=e.point
                this.setState({ 'clicked_points': points },self.planRoute("update"))
            })
            marker2.addEventListener('rightclick', () => {
                marker2.remove()
                let ind = points.findIndex((value, index, arr) => {
                    return value === pt;
                })
                points.splice(ind, 1)
                this.setState({ 'clicked_points': points })
            })
        })
    }

    render() {
        return (
            <div>
            <div className="monitor-map" id="map">map</div>
            <MapSearch map={this.state.map}/>
    </div>
    );
    }
}

export default TrafficGuideMap;
