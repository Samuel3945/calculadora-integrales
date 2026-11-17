import { MathfieldElement } from 'mathlive'
// Font files are bundled by Vite from the package CSS, so MathLive must not try to fetch them itself.
import 'mathlive/fonts.css'

MathfieldElement.fontsDirectory = null
MathfieldElement.soundsDirectory = null
MathfieldElement.locale = 'es'

export { MathfieldElement }
