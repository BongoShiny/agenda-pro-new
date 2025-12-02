import Agenda from './pages/Agenda';
import ConfiguracaoTerapeutas from './pages/ConfiguracaoTerapeutas';
import GerenciarUsuarios from './pages/GerenciarUsuarios';
import HistoricoAgendamentos from './pages/HistoricoAgendamentos';
import ConfigurarUnidades from './pages/ConfigurarUnidades';
import Administrador from './pages/Administrador';


export const PAGES = {
    "Agenda": Agenda,
    "ConfiguracaoTerapeutas": ConfiguracaoTerapeutas,
    "GerenciarUsuarios": GerenciarUsuarios,
    "HistoricoAgendamentos": HistoricoAgendamentos,
    "ConfigurarUnidades": ConfigurarUnidades,
    "Administrador": Administrador,
}

export const pagesConfig = {
    mainPage: "Agenda",
    Pages: PAGES,
};