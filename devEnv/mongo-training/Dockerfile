FROM ubuntu:xenial

RUN apt-get update && apt-get install -y \
    curl \
    git  \
    vim  \
    tmux \
    mc   \
    htop \
    python \
    build-essential \
    iputils-ping \
    && apt-get clean && rm -rf /var/lib/apt/lists

#Install NodeJS
RUN curl -sL https://deb.nodesource.com/setup_6.x | bash - && apt-get install -y nodejs

RUN git clone git://github.com/c9/core.git cloud9 && \
		cd cloud9 && ./scripts/install-sdk.sh && apt-get clean && rm -rf /var/lib/apt/lists
    

#Bash configuration    
ADD bash/bashrc /root/.bashrc



#Mongo shell installation 
RUN apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927
RUN echo "deb http://repo.mongodb.org/apt/ubuntu trusty/mongodb-org/3.2 multiverse" > /etc/apt/sources.list.d/mongodb-org-3.2.list

RUN apt-get update && apt-get install -y --allow-unauthenticated \
    mongodb-org-shell \
    mongodb-org-tools \	
    && apt-get clean && rm -rf /var/lib/apt/lists
	
#Util nodejs packages
RUN npm install -g local-web-server