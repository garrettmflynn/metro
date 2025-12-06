import overlay from '../../src/plugins/overlay'

const config = {
    name: "MyRoute Desktop",
    target: "electron",
    plugins: {
        overlay: overlay({ debug: false }),
    }
}

export default config