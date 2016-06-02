FROM ubuntu:xenial

RUN apt-get update && apt-get install -y \
    curl \
    git  \
    vim  \
    zsh  \
    tmux \
    mc   \
    htop \
    python \
    build-essential \
    && apt-get clean && rm -rf /var/lib/apt/lists

#Install NodeJS
RUN curl -sL https://deb.nodesource.com/setup_6.x | bash - && apt-get install -y nodejs

RUN npm install -g typescript ts-node yo tsserver-client ungit

RUN git clone git://github.com/c9/core.git cloud9 && \
		cd cloud9 && ./scripts/install-sdk.sh && apt-get clean && rm -rf /var/lib/apt/lists
    

#Bash configuration    
ADD bash/bashrc /root/.bashrc

#Zsh configuration
ADD zsh/zshrc /root/.zshrc
ADD zsh/oh-my-zsh /root/.oh-my-zsh

#tmux configuration
ADD tmux/tmux.conf /root/.tmux.conf


#Vim configuration
ADD vim /root/.vim
ADD vim/vimrc /root/.vimrc