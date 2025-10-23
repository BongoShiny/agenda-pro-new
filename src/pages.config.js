import Agenda from './pages/Agenda';
import ConfiguracaoTerapeutas from './pages/ConfiguracaoTerapeutas';
import GerenciarUsuarios from './pages/GerenciarUsuarios';


export const PAGES = {
    "Agenda": Agenda,
    "ConfiguracaoTerapeutas": ConfiguracaoTerapeutas,
    "GerenciarUsuarios": GerenciarUsuarios,
}

export const pagesConfig = {
    mainPage: "Agenda",
    Pages: PAGES,
};