import './home.styl'
import React, {useState} from 'react'
import Header from '../components/header'
import Left from "../components/left"
import Right from "../components/right"
import $ from 'jquery'
import 'jquery-ui/themes/base/draggable.css' //此css不引入也不影响draggable 功能
import 'jquery-ui/themes/base/resizable.css' //使用resizable功能必须引入此css！
import 'jquery-ui/ui/widgets/draggable' //必须像如下这样直接引入，import 'jquery-ui' 这样引入是无效的
import 'jquery-ui/ui/widgets/resizable'
import { filterBody } from '../utils/data'
import fileOperator from '../utils/file'
import { Spin } from 'antd'

const Store = window.require('electron-store')
const store = new Store({'name': 'book_config'})
const fileStore = new Store({'name': 'settings'})
let fileLocation = fileStore.get('fileLocation')

// 定义保存文件的路径，也就是保存文件的默认目录
const { remote } = window.require('electron')
const defaultLocation = remote.app.getPath('documents') + '/my-book'

// 如果用户设置不存在，那么就使用默认目录
if (!fileLocation) {
  fileLocation = defaultLocation
  // 使用默认值后要设置一下
  fileStore.set('fileLocation', fileLocation)
}

// 使用前先检测一下是否存在，不存在就自动创建一个新的
fileOperator.checkDir(fileLocation)

const Home = () => {
  const [dirs, setDirs] = useState(store.get('dirs'))
  const [searchDirs, setSearchDirs] = useState(null)
  // 设置当前选中的file
  const [file, setFile] = useState(null)
  // 设置加载状态
  const [loading, setLoading] = useState(false)

  // 直接写在函数中即可。
  $('.body-left').resizable({
    handles:'e', //'e'是east，允许拖动右侧边框的意思
    maxWidth: 500,
    minWidth: 280,
    //resize方法在#left大小改变后被执行
    resize:function(event,ui){
      // 由于我们调整的是#left的大小，当#left改变时，要同时改变右侧相邻DOM的宽度。
      // 如果有多列，就还需要减去其他列的宽度。就是一个减法运算，一共有多少，减去用掉的，就是需要的值。
      // 总宽度 - 实时的左侧宽度 = 右侧的宽度，ui.size.width 就是拖动窗口的实时宽度
      $('.body-right').width($('.body').width() - ui.size.width)
    }
  })

  return (
    <div className="home">
      {
        loading &&
        <div className="loading">
          <Spin size="large" delay={100}/>
        </div>
      }
      <Header className="header" file={file} setFile={setFile} store={store}
              fileLocation={fileLocation} setLoading={setLoading}
              filterBody={filterBody} dirs={dirs} setDirs={setDirs}
              setSearchDirs={setSearchDirs}/>
      <div className="body">
        {
          dirs
            ? <Left className="body-left" dirs={searchDirs ? searchDirs : dirs} setDirs={setDirs}
                    fileLocation={fileLocation} filterBody={filterBody} setLoading={setLoading}
                    file={file} setFile={setFile} store={store} />
            : <div className="body-left"/>
        }
        {
          file
            ? <Right className="body-right" file={file} setFile={setFile} store={store}
                     fileLocation={fileLocation} setLoading={setLoading}
                     filterBody={filterBody}  dirs={dirs} setDirs={setDirs} />
            : <div className='body-right' />
        }
      </div>
    </div>
  )
}

export default Home
