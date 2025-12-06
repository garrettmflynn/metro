import overlay from './src/plugins/overlay'


const config = {
    name: "MyRoute",
    target: "electron",
    // icon: "./assets/icon.png",


    plugins: {

        // // --------------------------------- Required Plugins --------------------------------- //
        overlay: overlay({ debug: false }),

    }
}

export default config